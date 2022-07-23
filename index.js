const { exportI18nMessages } = require("./export_i18n")
const { importI18nMessages } = require("./import_i18n")
const yargs = require('yargs/yargs')(process.argv.slice(2))


const argv = yargs
    .usage('Usage: $0 <command> [options]')
    .command('export', 'export all i18n messages in an excel file', (yargs) => {
        return yargs
            .alias('d', 'dir')
            .alias('o', 'output')
            .nargs('d', 1)
            .nargs('o', 1)
            .default('o', 'i18n-message-as-excel.xlsx')
            .describe('d', 'Directory that contains json and vue files')
            .describe('o', 'output excel file')
            .example('$0 export -d files_directory -o excel_file.xlsx', 'export all i18n messages from files directory in excel_file.xlsx')
            .demandOption(['d'])
    })
    .command('import', 'import all i18n messages from an excel file', (yargs) => {
        return yargs
            .alias('f', 'file')
            .alias('i', 'fids')
            .nargs('f', 1)
            .nargs('i', 1)
            .describe('f', 'Load a file')
            .describe('i', 'file ids per path')
            .example('$0 import -f excel_file.xlsx -i filesIdsPerPath.json', 'import all i18n messages from excel_file.xlsx file')
            .demandOption(['f', 'fids'])
    })
    .demandCommand(1, 1, 'choose a command: export or import')
    .strict()
    .help('h')
    .alias('h', 'help')
    .epilog('copyright 2022')
    .argv;



switch (argv._[0]) {
    case 'import':
        importI18nMessages(argv.file, argv.fids)
        break
    case 'export':
        exportI18nMessages(argv.dir, argv.output)
        break
    default:
        console.log("UNKNOW COMMAND")
}
