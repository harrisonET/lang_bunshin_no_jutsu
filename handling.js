const fs = require('fs');
const path = require('path');

// Function to update or add key-value pairs from the list to the JSON file
function updateJsonFile(jsonFilePath, obj) {
    // Read the JSON file
    let jsonData;
    try {
        const data = fs.readFileSync(path.join(jsonFilePath), 'utf-8');
        jsonData = JSON.parse(data);
    } catch (error) {
        console.error('Error reading or parsing JSON file:', error);
        return;
    }

    for (const key in obj) {
        const value = obj[key];

        // Count occurrences of the key in the JSON file
        const keyOccurrences = Object.keys(jsonData).filter(k => k === key).length;
        if (keyOccurrences === 1) {
            // If the key exists once and value matches, update the value
            jsonData[key] = value;
            console.log(`Updated: ${key} -> ${value}`);
        } else if (keyOccurrences === 0) {
            // If the key is not found, add a new key-value pair
            jsonData[key] = value;
            console.log(`Added: ${key} -> ${value}`);
        }
    }
    // Write the updated data back to the JSON file
    try {
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 4), 'utf-8');
        console.log('File updated successfully.');
    } catch (error) {
        console.error('Error writing to the JSON file:', error);
    }
}

module.exports = updateJsonFile;