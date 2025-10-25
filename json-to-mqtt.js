module.exports = function(RED) {
    function JsonToMqttNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Configuration from the settings
        const prefix = config.prefix || '';
        const outputFormat = config.outputFormat || 'naked';
        const includeNull = config.includeNull || false;
        
        node.on('input', function(msg) {
            try {
                const jsonData = msg.payload;
                const messages = [];
                
                // Recursive function to process JSON
                function processJSON(obj, path = [], parentObj = null, parentKey = null) {
                    // For parent_object format, check if this object contains only primitives
                    if (outputFormat === 'parent_object' && path.length > 0) {
                        let hasOnlyPrimitives = true;
                        for (let k in obj) {
                            if (obj.hasOwnProperty(k)) {
                                const v = obj[k];
                                if (v !== null && typeof v === 'object') {
                                    hasOnlyPrimitives = false;
                                    break;
                                }
                            }
                        }

                        if (hasOnlyPrimitives) {
                            // Create one message for the whole object
                            const payload = {};
                            for (let k in obj) {
                                if (obj.hasOwnProperty(k)) {
                                    const v = obj[k];
                                    if (v !== null || includeNull) {
                                        payload[k] = v;
                                    }
                                }
                            }

                            const topicParts = prefix ? [prefix, ...path] : path;
                            const topic = topicParts.join('/');
                            messages.push({
                                topic: topic,
                                payload: payload
                            });
                            return; // Don't process children
                        }
                    }

                    // Normal processing for other formats or nested objects
                    for (let key in obj) {
                        if (!obj.hasOwnProperty(key)) continue;

                        const value = obj[key];
                        const currentPath = [...path, key];

                        // Skip null values if includeNull is false
                        if (value === null && !includeNull) continue;

                        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                            // Nested object - continue recursively
                            processJSON(value, currentPath, obj, key);
                        } else if (Array.isArray(value)) {
                            // Array - add index
                            value.forEach((item, index) => {
                                if (typeof item === 'object' && item !== null) {
                                    processJSON(item, [...currentPath, index.toString()], value, index);
                                } else {
                                    createMessage([...currentPath, index.toString()], item, value, index);
                                }
                            });
                        } else {
                            // Primitive value - create MQTT message
                            createMessage(currentPath, value, obj, key);
                        }
                    }
                }
                
                // Create MQTT message according to the format
                function createMessage(pathArray, value, parentObj, key) {
                    // Sestavení topicu
                    const topicParts = prefix ? [prefix, ...pathArray] : pathArray;
                    const topic = topicParts.join('/');
                    
                    let payload;
                    
                    switch(outputFormat) {
                        case 'naked':
                            // Only the value
                            payload = value;
                            break;
                            
                        case 'value':
                            // {"value": 123}
                            payload = { value: value };
                            break;
                            
                        case 'last_key':
                            // {"temp": 23.1}
                            payload = {};
                            payload[key] = value;
                            break;
                            
                        case 'parent_object':
                            // {"temp": 23.1, "hum": 67.5, ...}
                            if (parentObj && typeof parentObj === 'object') {
                                // Copy all primitive values from the parent object
                                payload = {};
                                for (let k in parentObj) {
                                    if (parentObj.hasOwnProperty(k)) {
                                        const v = parentObj[k];
                                        // Include only primitive values and null
                                        if (v === null || typeof v !== 'object') {
                                            payload[k] = v;
                                        }
                                    }
                                }
                            } else {
                                payload = { value: value };
                            }
                            break;
                            
                        default:
                            payload = value;
                    }
                    
                    messages.push({
                        topic: topic,
                        payload: payload
                    });
                }
                
                // Process JSON
                processJSON(jsonData);
                
                // Send all messages
                if (messages.length > 0) {
                    node.send([messages]);
                    node.status({
                        fill: "green",
                        shape: "dot",
                        text: `${messages.length} topics`
                    });
                } else {
                    node.status({
                        fill: "yellow",
                        shape: "ring",
                        text: "no data"
                    });
                }
                
            } catch(err) {
                node.error("Error processing JSON: " + err.message);
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "error"
                });
            }
        });
    }
    
    RED.nodes.registerType("json-to-mqtt", JsonToMqttNode);
}