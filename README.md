## Notion Database Exporter

#### Description
this action is used to export notion database to csv and json

#### Usage
```
  - name: Notion database export to csv and json
    uses: visionwx/notion-database-exporter@v1.0.0
    with:
        notionToken: xxxxx
        notionDatabaseId: xxxx
        columnNames: Module,Key,Attribute,en,zh,Remark,Status
        columnTypes: multi_select,title,select,rich_text,rich_text,rich_text,status
        allowDuplicatedTitle: false
        output: out
```

#### Inputs
- notionToken: The notion integration token
- notionDatabaseId: The notion database id'
- columnNames: The column names you want to export and convert, seperate by ",", e.g. task name,task assigner
- columnTypes: The column types of the column names
- allowDuplicatedTitle: Whether duplicated title is allowed, only check when columnTypes has title type
- output: The ouput folder path