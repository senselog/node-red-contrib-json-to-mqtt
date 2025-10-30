# node-red-contrib-json-to-mqtt

A Node-RED node that converts any JSON object into an MQTT topic tree with configurable output formats. Perfect for bridging complex JSON APIs with MQTT-based systems.

## Installation

### Via NPM
```bash
npm install node-red-contrib-json-to-mqtt
```

### Via Node-RED Palette Manager
1. Open Node-RED
2. Go to Menu → Manage palette
3. Search for `node-red-contrib-json-to-mqtt`
4. Click Install

## Features

- ✅ **Universal JSON support** - Handles any complex JSON structure, including nested objects and arrays
- ✅ **Flexible output formats** - 4 different output modes to match your MQTT consumer requirements
- ✅ **Topic prefix** - Optional prefix for all generated MQTT topics
- ✅ **Array indexing** - Arrays automatically indexed in topic path (e.g., `sensors/0`, `sensors/1`)
- ✅ **Null value control** - Choose whether to include or skip null values
- ✅ **Zero dependencies** - Lightweight implementation with no external dependencies
- ✅ **Dynamic hints** - In-editor help that updates based on selected format

## Quick Start

1. Drag the **json-mqtt** node from the Network palette into your flow
2. Configure the **Topic Prefix** (optional, e.g., "weatherstation")
3. Select your desired **Output Format**
4. Connect the output to an **mqtt out** node
5. Send a JSON object to the input

**💡 Tip:** Import example flows from the `examples` folder to see the node in action!

## Output Formats

The node supports 4 different output formats to match your MQTT consumer requirements:

### Input Example
```json
{
  "home": {
    "sensors": [
      {
        "temp": 23.1,
        "hum": 67.5,
        "id": 1
      }
    ]
  }
}
```

### 1. Naked Value
Sends only the raw value without any wrapper. Best for simple numeric consumers.

```
Topic: home/sensors/0/temp
Payload: 23.1

Topic: home/sensors/0/hum
Payload: 67.5

Topic: home/sensors/0/id
Payload: 1
```

### 2. Value Object
Wraps the value in a JSON object with a `value` key. Useful for standardized consumers expecting this format.

```
Topic: home/sensors/0/temp
Payload: {"value": 23.1}

Topic: home/sensors/0/hum
Payload: {"value": 67.5}
```

### 3. Last Key
Creates a JSON object using the last key from the topic path. The payload contains the key-value pair.

```
Topic: home/sensors/0/temp
Payload: {"temp": 23.1}

Topic: home/sensors/0/hum
Payload: {"hum": 67.5}
```

### 4. Parent Object
Creates ONE message per object containing all primitive values. Stops at objects that contain only primitive values instead of creating individual messages for each field. This preserves the complete context of related values in a single message.

```
Topic: home/sensors/0
Payload: {"temp": 23.1, "hum": 67.5, "id": 1}
```

**Note**:
- Creates a single message at the object level (not one per field)
- Only primitive values (strings, numbers, booleans, null) are included in the payload
- Nested objects and arrays are excluded
- Useful when you want to keep all sensor readings together in one MQTT message

## Configuration

### Topic Prefix
Optional prefix added to all generated MQTT topics. For example, with prefix `"home"`:
- Without prefix: `sensors/0/temp`
- With prefix: `home/sensors/0/temp`

### Include Null Values
When checked, null values in the JSON will be published to MQTT topics. When unchecked (default), null values are skipped.

### Output Format
Choose from 4 different output formats. The node provides dynamic hints in the editor that explain each format with examples.

## How It Works

1. **Recursive traversal** - The node recursively walks through your JSON structure
2. **Path building** - Builds MQTT topic paths from JSON keys (e.g., `data.sensors[0].temp` → `data/sensors/0/temp`)
3. **Array handling** - Arrays are automatically indexed (0, 1, 2, ...)
4. **Batch output** - All messages are sent as an array in a single output, ready for mqtt out node

## Real-World Example

**Weather station API response:**
```json
{
  "station": {
    "id": "WS001",
    "readings": [
      {
        "temp": 23.1,
        "humidity": 67.5,
        "pressure": 1013.25
      }
    ]
  }
}
```

**Configuration:**
- Prefix: `weatherstation`
- Format: `naked`

**Output (sent to MQTT):**
```
Topic: weatherstation/station/id
Payload: "WS001"

Topic: weatherstation/station/readings/0/temp
Payload: 23.1

Topic: weatherstation/station/readings/0/humidity
Payload: 67.5

Topic: weatherstation/station/readings/0/pressure
Payload: 1013.25
```

## Use Cases

- 🌡️ **IoT Sensor Data** - Convert sensor readings from REST APIs to MQTT topics
- 🏠 **Smart Home Integration** - Bridge JSON-based devices to MQTT home automation systems
- 📊 **Data Distribution** - Fan out complex data structures to multiple MQTT consumers
- 🔄 **Protocol Translation** - Convert between JSON APIs and MQTT-based systems

## Troubleshooting

**No messages output**
- Check that input payload is a valid JSON object
- Verify "Include null values" setting if your data contains nulls

**Too many messages**
- Consider using "Parent object" format to reduce message count
- This groups related values into single messages at object level

**Topic structure not as expected**
- Review your JSON structure - topics mirror the JSON hierarchy
- Use Topic Prefix to add common prefix to all topics

## Contributing

Issues and pull requests welcome at [GitHub repository](https://github.com/senselog/node-red-contrib-json-to-mqtt)

## License

MIT © SenseLog.com