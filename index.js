/**
 * Import
 */
const { Client } = require("@notionhq/client");
const json2csv = require("json2csv");
const fs = require("fs");
const fse = require('fs-extra');
const dotenv = require("dotenv");
const core = require('@actions/core');
const github = require('@actions/github');

dotenv.config()

/**
 * The notion property type that support
 */
const TYPE_MULTI_SELECT = "multi_select";
const TYPE_SELECT       = "select";
const TYPE_TITLE        = "title";
const TYPE_RICH_TEXT    = "rich_text";
const TYPE_STATUS       = "status";
const SUPPORT_NOTION_TYPES = [
  TYPE_MULTI_SELECT,
  TYPE_SELECT,
  TYPE_TITLE,
  TYPE_RICH_TEXT,
  TYPE_STATUS
];

/**
 * Get para from env
 */
function getEnvPara(
  parameterName, 
  defaultValue = undefined, 
  raiseExceptionIfNone = true
) {
  let parameterValue = process.env[parameterName] ?? defaultValue;
  if (parameterValue === undefined) {
      console.log(parameterName + " not provide");
      core.setFailed(parameterName + " not provide");
      throw new Error(parameterName + " not provide");
  }
  return parameterValue;
}

/**
 * Get para from action input
 */
function getInputPara(parameterName) {
  let val = core.getInput(parameterName);
  if (val === "") {
    val = getEnvPara(parameterName);
  }
  if (val == "false" || val == "False") {
    val = false;
  }
  if (val == "true" || val == "True") {
    val = true;
  }
  return val;
}

/**
 * Convert json data to csv data
 * Then save to local file.
 */
 async function convertAndSave(jsonData, fields, out) {

  const csv = await json2csv.parseAsync(
    jsonData, 
    {
      fields: fields,
      // quote: ''
    }
  );

  await fse.ensureDir(out);

  fs.writeFile(
    out + "data.csv", 
    csv, 
    function (err) {
      if (err) throw err;
      console.log('CSV File Saved!')
    }
  );

  fs.writeFile(
    out + "data.json", 
    JSON.stringify(jsonData), 
    function (err) {
      if (err) throw err;
      console.log('JSON File Saved!')
    }
  );

}

/**
 * Parse column info
 */
function parseColumnInfo(columnNames, columnTypes) {
  console.log("-----> Parse column info: ");
  const columnNamesList = columnNames.split(",");
  const columnTypesList = columnTypes.split(",");

  if (columnNamesList.length != columnTypesList.length) {
    core.setFailed("columnNames or columnTypes para error");
    throw new Error("columnNames or columnTypes para error");
  }

  const result = [];
  for (let i=0;i<columnNamesList.length;i++) {
    if (!(SUPPORT_NOTION_TYPES.includes(columnTypesList[i]))) {
      core.setFailed("columnType not support, " + columnTypesList[i] + ", " + SUPPORT_NOTION_TYPES.toString());
      throw new Error("columnType not support, " + columnTypesList[i]);
    }
    result.push({
      "name": columnNamesList[i],
      "type": columnTypesList[i]
    });
  }
  console.log(result);
  return result;
  
}

/**
 * Get property value
 */
function getPagePropertyValue(properties, columnInfo) {
  const cname = columnInfo.name;
  const ctype = columnInfo.type;

  if (properties[cname] === undefined || !properties[cname]) {
    console.log(properties);
    console.log(properties[cname]);
    core.setFailed("columnName not found, " + cname);
    throw new Error("columnName not found, " + cname);
  }

  if (properties[cname][ctype]) {
    if (ctype == TYPE_MULTI_SELECT) {
      return properties[cname][ctype]
        .map(propertyItem => propertyItem.name)
        .join("");
    } else if (ctype == TYPE_TITLE) {
      return properties[cname][ctype]
        .map(propertyItem => propertyItem.plain_text)
        .join("");
    } else if (ctype == TYPE_RICH_TEXT) {
      return properties[cname][ctype]
        .map(propertyItem => propertyItem.plain_text)
        .join("");
    } else if (ctype == TYPE_SELECT) {
      return properties[cname][ctype].name;
    } else if (ctype == TYPE_STATUS) {
      return properties[cname][ctype].name;
    } else {
      return "None";
    }
  } else {
    return "None";
  } 

}

/**
 * Get data from notion database
 * return jsonData
 */
async function getDataFromDatabase() {
  const pages = []
  let cursor = undefined

  while (true) {
    const { results, next_cursor } = await notion.databases.query({
      database_id: notionDatabaseId,
      start_cursor: cursor,
    })
    pages.push(...results)
    if (!next_cursor) {
      break
    }
    cursor = next_cursor
  }
  console.log(`-----> ${pages.length} pages successfully fetched.`)

  const titles = [];
  const datas = [];
  for (const page of pages) {
    // console.log("-----> process page, pageId = " + page.id);
    const pageJsonObj = {};
    for (const columnInfo of columnToExport) {
      pageJsonObj[columnInfo.name] = getPagePropertyValue(
        page.properties,
        columnInfo
      );
      if (columnInfo.type == TYPE_TITLE) {
        if (titles.includes(pageJsonObj[columnInfo.name]) && !allowDuplicatedTitle) {
          // duplicated title detect and not allow
          core.setFailed("duplicated title detected, " + pageJsonObj[columnInfo.name]);
          throw new Error("duplicated title detected, " + pageJsonObj[columnInfo.name]);
        }
        titles.push(pageJsonObj[columnInfo.name]);
      }
    }
    datas.push(pageJsonObj);
  }

  return datas;

}


async function main() {
  /**
  * Export notion database as jsondatas
  */
  const jsonDatas = await getDataFromDatabase();

  /**
  * Convert jsondata to csv and save to local
  */
  convertAndSave(
    jsonDatas,
    columnToExport.map((c) => {return c.name}),
    outFolder
  );
}

/**
 * Get para
 */
const notionToken = getInputPara("notionToken");
const notionDatabaseId = getInputPara("notionDatabaseId");
const columnNames = getInputPara("columnNames");
const columnTypes = getInputPara("columnTypes");
const allowDuplicatedTitle = getInputPara("allowDuplicatedTitle");
const outFolder = getInputPara("output");
const columnToExport = parseColumnInfo(
  columnNames,
  columnTypes
);

/**
 * Notion Obj
 */
const notion = new Client({ auth: notionToken })

main();
