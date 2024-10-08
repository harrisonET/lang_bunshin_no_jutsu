const translate = require('translate-google')
const updateJsonFile = require('./handling');

const LANGS = ['id', 'ko', 'ja', 'su'];

const FILE_PATH = "./input/";

objToTrans = {
    "forTesting" : "For testing purpose"
}

for(let lang of LANGS){
    translate(objToTrans, {to: lang, except:[]}).then(res => {
        console.log( lang + " => " + JSON.stringify(res));
        if(FILE_PATH != null)
            updateJsonFile(getFilePath(lang), res);
        console.log("");
    }).catch(err => {
        console.error(err)
    })
}

function getFilePath(lang){
    return FILE_PATH + (lang == 'ms' ? 'my' : lang) + ".json";
}



