# vue-i18n-message-handler

This packages allows to export and import i18n messages from vue projets.
All considered files are .json and .vue files.


## Export i18n message 

```
node index.js export -d directory -o excel_file.xlsx
```
By default excel file name is `i18n-message-as-excel.xlsx`. This command will then export two files such as an excel file that contains all i18n messages by language.

For instance, for the following i18n json object:
```
{
    fr: {
      yes: Oui,
      no: Non
    },
    en:{
      yes: Yes,
      no:  No
    }
}

```

The generated excel file will have following structure:

key           | fr            | en            |
------------- | ------------- | ------------- |
yes           | Oui           | Yes           |
no            | Non           | No            |

If we have many i18n messages to extract from many files, the generated excel file will have many sheet_name when each sheet name refers to the corresponding file path when we extract i18n message.

The `export` command will then generate another file called `filesPathIds.json` that will contains information matching each sheet name by file path where we extract i18n messages.


## Import i18n message

```
node index.js import -f i18n-message-as-excel.xlsx -i filesPathIds.json

```

The `import` command will take at input an excel file that has same structure as described above and the `filesPathIds.json` file.
It will replace all i18n messages of each file described in `filesPathIds.json` by i18n messages in `i18n-message-as-excel.xlsx`.