const cliProgress = require("cli-progress")
const colors = require("ansi-colors")

const getLoadingBar = (displayMessage = "") => {
    return new cliProgress.SingleBar({
        format: `${displayMessage} ... ({file}) |` + colors.green('{bar}') + '| {percentage}%',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,

    });
}

const getEndOfObjectContentIndex = (text) => {
    const map = {
        "}": "{"
    }
    let stack = []
    for (let i = 0; i < text.length; i++) {
        if (text[i] === "{") {
            stack.push(text[i])
        } else if (stack[stack.length - 1] === map[text[i]]) {
            stack.pop()
        }
        if (!stack.length) {
            return i + 1
        }
    }
    return -1
}

const getJsObjectPerimeterFromString = (text, objectName = "i18n") => {
    const i18nKeyStartIndex = text.indexOf(`${objectName}:`);
    const textFromI18nKey = text.substring(i18nKeyStartIndex)
    const firstBracketIndex = textFromI18nKey.indexOf("{")
    const textFromI18nContent = textFromI18nKey.substring(firstBracketIndex)
    const endOfI18nContentIndex = getEndOfObjectContentIndex(textFromI18nContent)
    const textContentI18nStart = i18nKeyStartIndex + firstBracketIndex
    const textContentI18nEnd = i18nKeyStartIndex + firstBracketIndex + endOfI18nContentIndex
    return { start: textContentI18nStart, end: textContentI18nEnd }
}

const replaceSubContentOf = (text, startIndex, endIndex, subContentToInsert) => {
    return text.substring(0, startIndex) + subContentToInsert + text.substring(endIndex)
}

const truncateString = (str, expectedLength) => {
    const lastFiveChar = str.slice(-10)
    const threddDots = '...'
    return str.length > expectedLength ? str.slice(0, expectedLength >= 13 ? expectedLength - 13 : expectedLength) + threddDots + lastFiveChar : str;
}

module.exports = { getLoadingBar, getJsObjectPerimeterFromString, replaceSubContentOf, truncateString }