module.exports = function(RED) {
    function JsonToMqttNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration from the settings
        const prefix = (config.prefix || '').replace(/^\/+|\/+$/g, '');
        const outputFormat = config.outputFormat || 'naked';
        const includeNull = config.includeNull || false;

        node.on('input', function(msg, send, done) {
            try {
                const jsonData = msg.payload;

                if (jsonData === null || typeof jsonData !== 'object') {
                    node.status({
                        fill: "red",
                        shape: "dot",
                        text: "invalid input"
                    });
                    done(new Error("msg.payload must be a JSON object or array, got "
                        + (jsonData === null ? "null" : typeof jsonData)
                        + (typeof jsonData === 'string' ? " (use a JSON node to parse strings first)" : "")));
                    return;
                }

                const messages = [];

                function buildTopic(path) {
                    return (prefix ? [prefix, ...path] : path).join('/');
                }

                // Recursive function to process JSON (objects and arrays;
                // for...in over arrays yields string indices)
                function processJSON(obj, path = []) {
                    if (outputFormat === 'parent_object') {
                        // One message per object/array: group its primitive
                        // entries into a single payload, recurse into nested
                        // objects and arrays
                        const payload = {};
                        let hasPrimitives = false;

                        for (let key in obj) {
                            if (!obj.hasOwnProperty(key)) continue;

                            const value = obj[key];

                            if (value !== null && typeof value === 'object') {
                                processJSON(value, [...path, key]);
                            } else if (value !== null || includeNull) {
                                payload[key] = value;
                                hasPrimitives = true;
                            }
                        }

                        if (hasPrimitives) {
                            const topic = buildTopic(path);
                            if (topic) {
                                messages.push({
                                    topic: topic,
                                    payload: payload
                                });
                            } else {
                                // Root-level primitives have an empty path, so
                                // there is no topic to publish them under
                                node.warn("parent_object format: root-level primitive values skipped because the topic would be empty; set a Topic Prefix to publish them");
                            }
                        }
                        return;
                    }

                    for (let key in obj) {
                        if (!obj.hasOwnProperty(key)) continue;

                        const value = obj[key];
                        const currentPath = [...path, key];

                        // Skip null values if includeNull is false
                        if (value === null && !includeNull) continue;

                        if (value !== null && typeof value === 'object') {
                            // Nested object or array - continue recursively
                            processJSON(value, currentPath);
                        } else {
                            // Primitive value - create MQTT message
                            createMessage(currentPath, value, key);
                        }
                    }
                }

                // Create MQTT message according to the format
                function createMessage(pathArray, value, key) {
                    let payload;

                    switch (outputFormat) {
                        case 'value':
                            // {"value": 123}
                            payload = { value: value };
                            break;

                        case 'last_key':
                            // {"temp": 23.1}
                            payload = {};
                            payload[key] = value;
                            break;

                        case 'naked':
                        default:
                            // Only the value
                            payload = value;
                    }

                    messages.push({
                        topic: buildTopic(pathArray),
                        payload: payload
                    });
                }

                // Process JSON
                processJSON(jsonData);

                // Send all messages
                if (messages.length > 0) {
                    send([messages]);
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

                done();
            } catch(err) {
                node.status({
                    fill: "red",
                    shape: "dot",
                    text: "error"
                });
                done(err);
            }
        });
    }

    RED.nodes.registerType("json-to-mqtt", JsonToMqttNode);
}
