const fs = require("fs")
const glob = require("glob")
const compiler = require("vue-template-compiler")
const XLSX = require('xlsx')
const path = require("path")
const { getLoadingBar, getJsObjectPerimeterFromString, truncateString } = require("../utils")
const JSON5 = require('json5')


const extractI18nFromCustomBlock = (vueComponent) => {
    const i18nBlock = vueComponent.customBlocks.find(block => block.type === 'i18n')

    if (!i18nBlock) {
        return ''
    }

    return JSON.parse(i18nBlock.content)
}

const extractI18nFromScriptBlock = (vueComponent) => {

    const scriptContent = vueComponent.script.content

    if (scriptContent.includes("i18n:")) {

        const { start, end } = getJsObjectPerimeterFromString(scriptContent, "messages")

        const i18nFinalContent = scriptContent.substring(start, end)
        const content = JSON5.parse(i18nFinalContent)

        return content
    }

    return null
}

const generateJson = (jsonObject, fileName = "test.json") => {
    const jsonContent = JSON.stringify(jsonObject, null, 2);
    fs.writeFile(fileName, jsonContent, 'utf8', function (err) {
        if (err) {
            console.log("An error occured while writing JSON Object to File.");
            return console.log(err);
        }
    });
}


const getFromPath = (object, path) => {
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


const getAlli18nObjectPath = (obj) => {
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
            row[objKey] = getFromPath(obj[objKey], key)
        })

        return row
    })
}

const getObjectKeys = (obj, previousPath = '', objectKeys = []) => {
    let result = [...objectKeys]
    // Step 1- Go through all the keys of the object
    Object.keys(obj).forEach((key) => {
        // Get the current path and concat the previous path if necessary
        const currentPath = previousPath ? `${previousPath}.${key}` : key;
        // Step 2- If the value is a string, then add it to the keys array
        if (typeof obj[key] !== 'object') {
            result.push(currentPath);
        } else {
            // result.push(currentPath);
            // Step 3- If the value is an object, then recursively call the function
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

        const fileId = truncateString(`${path.basename(file)}(${index})`, 31)

        if (path.extname(file) === ".vue") {
            const vueComponent = compiler.parseComponent(fs.readFileSync(file).toString())

            i18nData = extractI18nFromCustomBlock(vueComponent)

            if (!i18nData) {
                i18nData = extractI18nFromScriptBlock(vueComponent)
            }

            if (!i18nData) {
                filesProcessingLoadingBar.update(index + 1, { file: file });
                return
            }
            const finalKeys = getAlli18nObjectPath(i18nData)
            const excelData = computeArrayOfJsonData(i18nData, finalKeys)
            workSheet = createWorkSheet(excelData)
        } else if (path.extname(file) === ".json") {
            i18nData = JSON.parse(fs.readFileSync(file).toString())
            const finalKeys = getAlli18nObjectPath(i18nData)
            const excelData = computeArrayOfJsonData(i18nData, finalKeys)
            workSheet = createWorkSheet(excelData)
        }
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
    generateJson(filePathIds, "filesPathIds.json")

    filesProcessingLoadingBar.stop();
}

const exportI18nMessages = (dir, outputFileName) => {
    glob(`${dir}/**/!(package)*.{json,vue}`, (_, files) => processFiles(files, outputFileName))
}

module.exports = { exportI18nMessages }