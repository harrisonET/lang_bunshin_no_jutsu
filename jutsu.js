const translate = require('translate-google');
const path = require('path');
const updateJsonFile = require('./handling');
const {
    readJsonFile,
    writeJsonFile,
    flattenObject,
    auditJsonData,
    reconstructTargetObject
} = require('./handling');

// Configuration
const FILE_PATH = "D:\\Servedeck\\env1\\building-ops\\building-ops-web\\src\\main\\webapp\\i18n\\";
const LANGS = ['id', 'vi', 'th', 'zh-CN', 'zh-TW', 'ms', 'ar'];
const BATCH_SIZE = 30; // Max keys per translation request to avoid payload limits
const BATCH_DELAY_MS = 300; // Delay between translation requests

// Custom translation payload (Original Jutsu mode)
// If populated, node jutsu.js will translate this object directly into target files.
const objToTrans = {
    "itemRemarksPlaceholder": "Enter remarks (e.g. warranty, T&Cs)"
};

// CLI Flags
const args = process.argv.slice(2);
const isRasengan = args.includes('--rasengan');

function getFilePath(lang) {
    return path.join(FILE_PATH, (lang === 'ms' ? 'my' : lang) + ".json");
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Batch translates flat key-value pairs using translate-google.
 */
async function batchTranslate(flatMissingObj, targetLang) {
    const keys = Object.keys(flatMissingObj);
    const totalKeys = keys.length;
    const translatedResults = {};

    for (let i = 0; i < totalKeys; i += BATCH_SIZE) {
        const batchKeys = keys.slice(i, i + BATCH_SIZE);
        const batchObj = {};
        for (const k of batchKeys) {
            batchObj[k] = flatMissingObj[k];
        }

        console.log(`   ⏳ Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalKeys / BATCH_SIZE)} (${batchKeys.length} keys) to [${targetLang}]...`);

        try {
            const res = await translate(batchObj, { to: targetLang, except: [] });
            Object.assign(translatedResults, res);
        } catch (err) {
            console.error(`   ❌ Error translating batch for [${targetLang}]:`, err.message || err);
            Object.assign(translatedResults, batchObj);
        }

        if (i + BATCH_SIZE < totalKeys && BATCH_DELAY_MS > 0) {
            await sleep(BATCH_DELAY_MS);
        }
    }

    return translatedResults;
}

/**
 * Original Jutsu Mode: Translates custom objToTrans object into all target JSON files.
 */
async function runOriginalJutsu() {
    const overallStartTime = Date.now();
    console.log("==================================================");
    console.log("🌀 LANG BUNSHIN NO JUTSU (ORIGINAL TRANSLATION MODE) 🌀");
    console.log(`Payload: ${JSON.stringify(objToTrans, null, 2)}`);
    console.log("==================================================\n");

    for (const lang of LANGS) {
        const langStartTime = Date.now();
        console.log(`🌐 Translating for [${lang}]...`);
        try {
            const res = await translate(objToTrans, { to: lang, except: [] });
            console.log(`   ${lang} => ${JSON.stringify(res)}`);
            updateJsonFile(getFilePath(lang), res);
        } catch (err) {
            console.error(`   ❌ Error translating for [${lang}]:`, err.message || err);
        }
        const langDuration = ((Date.now() - langStartTime) / 1000).toFixed(2);
        console.log(`   ⏱️ Time taken: ${langDuration}s\n`);
    }

    const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);
    console.log("==================================================");
    console.log(`✨ Translation completed in ${totalDuration}s!`);
    console.log("==================================================");
}

/**
 * Audit & Rasengan Sync Mode: Audits en.json against target translation files.
 */
async function runAuditOrRasengan() {
    const overallStartTime = Date.now();

    console.log("==================================================");
    console.log("🌀 LANG BUNSHIN NO JUTSU 🌀");
    console.log(`Mode: [ ${isRasengan ? 'RASENGAN AUTO-SYNC (--rasengan)' : 'EN.JSON KEY AUDIT ONLY'} ]`);
    console.log(`Source Path: ${FILE_PATH}`);
    console.log("==================================================\n");

    const enPath = path.join(FILE_PATH, "en.json");
    let enData = {};
    let enFlat = {};

    try {
        const { data } = readJsonFile(enPath);
        enData = data;
        enFlat = flattenObject(enData);
        console.log(`📖 Loaded [en.json] - Total keys: ${Object.keys(enFlat).length}\n`);
    } catch (err) {
        console.error(`❌ Failed to read source file [en.json] at ${enPath}:`, err.message);
        process.exit(1);
    }

    for (const lang of LANGS) {
        const langStartTime = Date.now();
        const targetFilePath = getFilePath(lang);
        const targetFileName = path.basename(targetFilePath);

        console.log("--------------------------------------------------");
        console.log(`🌐 Language: [${lang}] (${targetFileName})`);
        console.log("--------------------------------------------------");

        let targetData = {};
        let hasBom = false;

        try {
            const fileResult = readJsonFile(targetFilePath);
            targetData = fileResult.data;
            hasBom = fileResult.hasBom;
        } catch (err) {
            console.warn(`⚠️ Warning: Could not read [${targetFileName}] (${err.message}). Starting with empty object.`);
        }

        const audit = auditJsonData(enData, targetData);

        console.log(`   📊 Matching Keys : ${audit.matchingKeys.length}`);
        console.log(`   ❌ Missing Keys  : ${audit.missingKeys.length}`);
        console.log(`   ⚠️ Extra Keys    : ${audit.extraKeys.length}`);

        if (isRasengan) {
            let newTranslations = {};

            if (audit.missingKeys.length > 0) {
                const missingObj = {};
                for (const key of audit.missingKeys) {
                    missingObj[key] = audit.sourceFlat[key];
                }
                newTranslations = await batchTranslate(missingObj, lang);
            } else {
                console.log(`   ✨ All keys present. No new translations needed.`);
            }

            const reconstructedData = reconstructTargetObject(enData, audit.targetFlat, newTranslations, true);
            writeJsonFile(targetFilePath, reconstructedData, hasBom);

            console.log(`   ✅ [${targetFileName}] synced successfully to match en.json key structure!`);
        }

        const langDuration = ((Date.now() - langStartTime) / 1000).toFixed(2);
        console.log(`   ⏱️ Time taken for [${lang}]: ${langDuration}s\n`);
    }

    const totalDuration = ((Date.now() - overallStartTime) / 1000).toFixed(2);

    console.log("==================================================");
    if (isRasengan) {
        console.log(`🌀 Rasengan completed in ${totalDuration}s!`);
        console.log(`   All target translation files now strictly follow en.json.`);
    } else {
        console.log(`📊 Audit completed in ${totalDuration}s!`);
        console.log(`   Run with '--rasengan' (node jutsu.js --rasengan) to auto-translate missing keys & prune extra keys.`);
    }
    console.log("==================================================");
}

async function main() {
    // If objToTrans has keys, run original custom key translation mode.
    // Otherwise, run en.json audit / --rasengan mode.
    if (typeof objToTrans !== 'undefined' && Object.keys(objToTrans).length > 0) {
        await runOriginalJutsu();
    } else {
        await runAuditOrRasengan();
    }
}

main().catch(err => {
    console.error("Fatal error during execution:", err);
});
