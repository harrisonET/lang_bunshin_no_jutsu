const fs = require('fs');
const path = require('path');

/**
 * Reads a JSON file, handles UTF-8 BOM if present.
 */
function readJsonFile(jsonFilePath) {
    const raw = fs.readFileSync(path.join(jsonFilePath), 'utf-8');
    const hasBom = raw.charCodeAt(0) === 0xFEFF;
    const data = JSON.parse(hasBom ? raw.slice(1) : raw);
    return { data, hasBom };
}

/**
 * Writes data back to a JSON file formatted with 4 spaces.
 */
function writeJsonFile(jsonFilePath, data, hasBom = false) {
    const jsonString = JSON.stringify(data, null, 4);
    const content = hasBom ? '\uFEFF' + jsonString : jsonString;
    fs.writeFileSync(jsonFilePath, content, 'utf-8');
}

/**
 * Recursively flattens an object to dot-notation paths.
 * E.g. { a: { b: "hello" } } -> { "a.b": "hello" }
 */
function flattenObject(obj, prefix = '') {
    let result = {};
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const propName = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];

        if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
            Object.assign(result, flattenObject(val, propName));
        } else {
            result[propName] = val;
        }
    }
    return result;
}

/**
 * Audits a target translation object against a source (en.json) translation object.
 */
function auditJsonData(sourceObj, targetObj) {
    const sourceFlat = flattenObject(sourceObj);
    const targetFlat = flattenObject(targetObj);

    const sourceKeys = Object.keys(sourceFlat);
    const targetKeysSet = new Set(Object.keys(targetFlat));

    const missingKeys = [];
    const matchingKeys = [];

    for (const key of sourceKeys) {
        if (targetKeysSet.has(key)) {
            matchingKeys.push(key);
        } else {
            missingKeys.push(key);
        }
    }

    const sourceKeysSet = new Set(sourceKeys);
    const extraKeys = Object.keys(targetFlat).filter(k => !sourceKeysSet.has(k));

    return {
        missingKeys,
        extraKeys,
        matchingKeys,
        sourceFlat,
        targetFlat
    };
}

/**
 * Reconstructs target object strictly following sourceObj structure & key order.
 * - Missing keys are filled with newTranslations[key] or fallback source value.
 * - Extra keys are pruned if isRasengan is true, or appended if false.
 */
function reconstructTargetObject(sourceObj, targetFlat, newTranslations = {}, isRasengan = false) {
    function buildRecursive(sourceSubObj, pathPrefix = '') {
        const result = {};
        for (const key in sourceSubObj) {
            if (!Object.prototype.hasOwnProperty.call(sourceSubObj, key)) continue;
            const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
            const val = sourceSubObj[key];

            if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
                result[key] = buildRecursive(val, fullPath);
            } else {
                if (Object.prototype.hasOwnProperty.call(targetFlat, fullPath)) {
                    result[key] = targetFlat[fullPath];
                } else if (Object.prototype.hasOwnProperty.call(newTranslations, fullPath)) {
                    result[key] = newTranslations[fullPath];
                } else {
                    result[key] = val; // fallback to English source value if translation missing
                }
            }
        }
        return result;
    }

    const reconstructed = buildRecursive(sourceObj);

    if (!isRasengan) {
        const sourceFlatKeys = new Set(Object.keys(flattenObject(sourceObj)));
        for (const key in targetFlat) {
            if (!sourceFlatKeys.has(key)) {
                reconstructed[key] = targetFlat[key];
            }
        }
    }

    return reconstructed;
}

/**
 * Legacy update function maintained for backward compatibility.
 */
function updateJsonFile(jsonFilePath, obj) {
    try {
        const { data: jsonData, hasBom } = readJsonFile(jsonFilePath);
        for (const key in obj) {
            const value = obj[key];
            if (Object.prototype.hasOwnProperty.call(jsonData, key)) {
                jsonData[key] = value;
                console.log(`Updated: ${key} -> ${value}`);
            } else {
                jsonData[key] = value;
                console.log(`Added: ${key} -> ${value}`);
            }
        }
        writeJsonFile(jsonFilePath, jsonData, hasBom);
        console.log('File updated successfully.');
    } catch (error) {
        console.error('Error updating JSON file:', error);
    }
}

module.exports = updateJsonFile;
module.exports.readJsonFile = readJsonFile;
module.exports.writeJsonFile = writeJsonFile;
module.exports.flattenObject = flattenObject;
module.exports.auditJsonData = auditJsonData;
module.exports.reconstructTargetObject = reconstructTargetObject;