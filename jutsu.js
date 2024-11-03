const translate = require('translate-google')
const updateJsonFile = require('./handling');
const { LANGS, FILE_PATH, objToTrans } = require('./config');

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



