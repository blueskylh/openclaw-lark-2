---
name: feishu-sheets
description: |
  飞书电子表格（Sheets）操作工具。支持读写单元格、追加数据、查找内容、创建表格、管理工作表（新增/删除/重命名）、插入删除行列、导出表格。

  **当以下情况时使用此 Skill**:
  (1) 用户提到「表格」「电子表格」「Sheet」「spreadsheet"
  (2) 需要读取或写入表格数据
  (3) 需要在表格中查找内容
  (4) 需要管理工作表（sheet）
  (5) 需要插入/删除行或列
---

# 飞书电子表格管理

## 🚨 执行前必读

- ✅ **spreadsheet_token**：表格 token，从飞书表格链接中获取（URL 中 `/sheets/` 后面的部分）
- ✅ **sheet_id**：工作表 ID，通过 `info` action 获取
- ✅ **range 格式**：`{sheet_id}!{起始格}:{结束格}`，例如 `0b37a8!A1:D10`

---

## 📋 快速索引：意图 → 工具 → 必填参数

| 用户意图 | 工具 | action | 必填参数 | 常用可选 |
|---------|------|--------|---------|----------|
| 查看表格信息/工作表列表 | feishu_sheets_sheet | info | spreadsheet_token | - |
| 读取单元格数据 | feishu_sheets_sheet | read | spreadsheet_token, range | - |
| 写入单元格数据 | feishu_sheets_sheet | write | spreadsheet_token, range, values[][] | - |
| 追加数据到末尾 | feishu_sheets_sheet | append | spreadsheet_token, range, values[][] | - |
| 查找内容 | feishu_sheets_sheet | find | spreadsheet_token, sheet_id, find | replace, replacement |
| 创建新表格 | feishu_sheets_sheet | create | title | folder_token |
| 新增工作表 | feishu_sheets_sheet | sheet_add | spreadsheet_token, title | index |
| 删除工作表 | feishu_sheets_sheet | sheet_delete | spreadsheet_token, sheet_id | - |
| 重命名工作表 | feishu_sheets_sheet | sheet_rename | spreadsheet_token, sheet_id, title | - |
| 插入行/列 | feishu_sheets_sheet | row_col_insert | spreadsheet_token, sheet_id, dimension, start_index, count | - |
| 删除行/列 | feishu_sheets_sheet | row_col_delete | spreadsheet_token, sheet_id, dimension, start_index, end_index | - |
| 导出表格 | feishu_sheets_sheet | export | spreadsheet_token | file_extension |

---

## 🎯 核心约束

### 1. 典型读写流程

```
info → 获取 sheet_id → read/write（使用 range）
```

### 2. range 格式说明

```
{sheet_id}!A1:D10   # 读取 A1 到 D10
{sheet_id}!A1       # 单个单元格
{sheet_id}!A:D      # 整列
```

### 3. values 格式（write/append）

二维数组，行 × 列：
```json
[["姓名", "年龄"], ["张三", 25], ["李四", 30]]
```

### 4. dimension（行列方向）

- `ROWS`：行
- `COLUMNS`：列
