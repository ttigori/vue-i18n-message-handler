const fs = require("fs")
const glob = require("glob")
const compiler = require("vue-template-compiler")
const XLSX = require('xlsx')
const path = require("path")
const { getLoadingBar, getJsObjectPerimeterFromString, truncateString } = require("../utils")
const JSON5 = require('json5')


const SHEET_NAME_MAX_LENGTH = 31

const extractI18nContentFromCustomBlock = (vueComponent) => {
    const i18nBlock = vueComponent.customBlocks.find(block => block.type === 'i18n')
    if (!i18nBlock) {
        return null
    }
    return JSON.parse(i18nBlock.content)
}

const extractI18nContentFromScriptBlock = (vueComponent) => {
    const scriptContent = vueComponent.script.content
    if (scriptContent.includes("i18n:")) {
        const { start, end } = getJsObjectPerimeterFromString(scriptContent, "messages")
        const i18nFinalContent = scriptContent.substring(start, end)
        const content = JSON5.parse(i18nFinalContent)
        return content
    }
    return null
}

const generateJsonFileFromJsObject = (jsonObject, fileName = "test.json") => {
    const jsonContent = JSON.stringify(jsonObject, null, 2);
    fs.writeFile(fileName, jsonContent, 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
    });
}

const getValueFromPath = (object, path) => {
    const keys = path.split('.');
    let result = object;
    for (const key of keys) {
        try {
            result = result[key];
        } catch (err) {
            continue
        }
    }
    return result;
}


const getAlli18nObjectPathes = (obj) => {
    let objectKeys = []
    Object.keys(obj).forEach((key) => {
        const keys = getObjectKeys(obj[key])
        objectKeys = objectKeys.concat(keys);
    })
    const finalKeys = [...new Set(objectKeys)]
    return finalKeys
}

const computeArrayOfJsonData = (obj, objectPathes) => {
    return objectPathes.map(key => {
        const row = { 'key': key }

        Object.keys(obj).forEach((objKey) => {
            row[objKey] = getValueFromPath(obj[objKey], key)
        })

        return row
    })
}

const getObjectKeys = (obj, previousPath = '', objectKeys = []) => {
    let result = [...objectKeys]
    // INFO T.T - 25/07/2022: In first step, we go through all objects keys
    Object.keys(obj).forEach((key) => {
        // INFO T.T - 25/07/2022: Get the current path and concat the previous path if necessary
        const currentPath = previousPath ? `${previousPath}.${key}` : key;
        // INFO T.T - 25/07/2022: In second step, if the value is not an object, then add it to the keys array
        if (typeof obj[key] !== 'object') {
            result.push(currentPath);
        } else {
            // INFO T.T - 25/07/2022: If the value is an object, then recursively call the function
            result = getObjectKeys(obj[key], currentPath, result);
        }
    });
    return result
}


const appendWorkSheetToWorkBook = (wb, ws, sheetName) => {
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

const createWorkSheet = (jsonData) => {
    const ws = XLSX.utils.json_to_sheet(jsonData);
    return ws
}

const createWorkBook = () => {
    const wb = XLSX.utils.book_new();
    return wb
}

const exportExcel = (workBook, fileName) => {
    XLSX.writeFile(workBook, fileName);

}

const processFiles = (files, outputFileName) => {

    if (!files.length) {
        console.log("No files found")
        return
    }

    const filesProcessingLoadingBar = getLoadingBar("Export i18n messages from files")
    filesProcessingLoadingBar.start(files.length, 0);
    const filePathIds = {}
    let workBook = createWorkBook()

    files.forEach((file, index) => {
        let workSheet;
        let i18nData
        const fileId = truncateString(`${path.basename(file)}(${index})`, SHEET_NAME_MAX_LENGTH)

        if (path.extname(file) === ".vue") {
            const vueComponent = compiler.parseComponent(fs.readFileSync(file).toString())
            // INFO T.T - 25/07/2022: We try first to extract message from i18n custom block, if we don't find anything, we try extraction in script block
            i18nData = extractI18nContentFromCustomBlock(vueComponent)
            if (!i18nData) {
                i18nData = extractI18nContentFromScriptBlock(vueComponent)
            }
        } else if (path.extname(file) === ".json") {
            i18nData = JSON.parse(fs.readFileSync(file).toString())
        } else {
            console.log("File not supported")
        }

        if (!i18nData) {
            filesProcessingLoadingBar.update(index + 1, { file: file });
            return
        }
        const finalKeys = getAlli18nObjectPathes(i18nData)
        const excelData = computeArrayOfJsonData(i18nData, finalKeys)
        workSheet = createWorkSheet(excelData)
        filePathIds[fileId] = file
        appendWorkSheetToWorkBook(workBook, workSheet, fileId)
        filesProcessingLoadingBar.update(index + 1, { file: file });
    })

    if (!workBook.SheetNames.length) {
        filesProcessingLoadingBar.update(files.length)
        filesProcessingLoadingBar.stop();
        return
    }

    exportExcel(workBook, outputFileName)
    generateJsonFileFromJsObject(filePathIds, "filesPathIds.json")
    filesProcessingLoadingBar.stop();
}

const exportI18nMessages = (dir, outputFileName) => {
    // INFO T.T - 25/07/2022: Here we check aall json and vue files except package-lock.json and package.json files
    glob(`${dir}/**/!(package)*.{json,vue}`, (_, files) => processFiles(files, outputFileName))
}

module.exports = { exportI18nMessages }