const fs = require("fs")
const compiler = require("vue-template-compiler")
const XLSX = require('xlsx')
const path = require("path")
const { getLoadingBar, getI18nStartAndEndIndexes } = require("../utils")
const JSON5 = require('json5')



const writeInI18nCustomBlock = (vueComponent, newI18nContentAsJson, vueContentAsString, filePath) => {

    const newI18nContent = `\n${JSON.stringify(newI18nContentAsJson, null, 2)}\n`

    const i18nBlock = vueComponent.customBlocks.filter(block => block.type === 'i18n')[0]
    if (i18nBlock) {
        writeIni18nBlock(vueContentAsString, i18nBlock.start, i18nBlock.end, filePath, newI18nContent)
    }

}

const writeInI18nOfScriptBlock = (vueComponent, newI18nContentAsJson, vueContentAsString, filePath) => {

    const newI18nContent = { messages: newI18nContentAsJson }
    const newI18nContentAsString = `  ${JSON5.stringify(newI18nContent, null, 2)}`

    const scriptContent = vueComponent.script.content
    if (scriptContent.includes("i18n:")) {
        const { start, end } = getI18nStartAndEndIndexes(scriptContent)
        const newScriptContent = replaceBetween(scriptContent, start, end, newI18nContentAsString)
        writeIni18nBlock(vueContentAsString, vueComponent.script.start, vueComponent.script.end, filePath, newScriptContent)
    }
}


function setValue(obj, path, value) {
    const keys = path.split('.')
    while (keys.length - 1) {
        let firstKey = keys.shift()
        if (!(firstKey in obj)) obj[firstKey] = {}
        obj = obj[firstKey]
    }
    obj[keys[0]] = value
}


function replaceBetween(str, start, end, what) {
    return str.substring(0, start) + what + str.substring(end)
}

const writeIni18nBlock = (content, i18nStart, i18nEnd, file, i18nBlockContent) => {
    fs.writeFileSync(
        file,
        replaceBetween(content, i18nStart, i18nEnd, i18nBlockContent)
    )
}

const importI18nMessages = (excelFilePath, idsPerPathesFile) => {

    const workbook = XLSX.readFile(excelFilePath);
    const sheet_name_list = workbook.SheetNames;

    const i18nImportLoadingBar = getLoadingBar("import i18n messages")
    i18nImportLoadingBar.start(sheet_name_list.length, 0);

    sheet_name_list.forEach((sheet_name, index) => {
        const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name]);
        let objectJson = {}
        xlData.forEach(item => {
            Object.keys(item).forEach(itemKey => {
                if (itemKey != "key") {
                    setValue(objectJson, `${itemKey}.${item.key}`, item[itemKey])
                }
            })
        })

        const filesPathIds = JSON.parse(fs.readFileSync(idsPerPathesFile).toString())
        const filePath = filesPathIds[sheet_name]

        if (!filePath) {
            return
        }

        if (path.extname(filePath) === ".json") {
            const content = JSON.stringify(objectJson, null, 2)
            fs.writeFileSync(filePath, content);
        } else if (path.extname(filePath) === ".vue") {
            const vueContentAsString = fs.readFileSync(filePath).toString()
            const vueComponent = compiler.parseComponent(vueContentAsString)

            writeInI18nCustomBlock(vueComponent, objectJson, vueContentAsString, filePath)
            writeInI18nOfScriptBlock(vueComponent, objectJson, vueContentAsString, filePath)
        }

        i18nImportLoadingBar.update(index + 1);

    })

    i18nImportLoadingBar.stop();

}

module.exports = { importI18nMessages }