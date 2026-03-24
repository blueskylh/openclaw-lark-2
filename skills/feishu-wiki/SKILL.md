---
name: feishu-wiki
description: |
  飞书知识库（Wiki）管理工具。支持知识空间的增删查改、空间设置、成员管理，以及节点的浏览、创建、移动、复制，将云文档移入知识库等操作。

  **当以下情况时使用此 Skill**:
  (1) 用户提到「知识库」「Wiki」「知识空间」「空间节点」
  (2) 需要浏览或管理知识库中的文档节点
  (3) 需要将云文档移入知识库
  (4) 需要管理知识空间成员或设置
---

# 飞书知识库管理

## 🚨 执行前必读

- ✅ **space_id**：知识空间 ID，通过 `feishu_wiki_space list` 获取
- ✅ **node_token**：节点 token，通过 `feishu_wiki_space_node list` 获取
- ✅ **move_docs_to_wiki**：将云文档（doc/sheet/bitable 等）移入知识库，需要文档所有者权限

---

## 📋 快速索引：意图 → 工具 → 必填参数

| 用户意图 | 工具 | action | 必填参数 | 常用可选 |
|---------|------|--------|---------|----------|
| 列出所有知识空间 | feishu_wiki_space | list | - | page_size |
| 获取空间详情 | feishu_wiki_space | get | space_id | - |
| 创建知识空间 | feishu_wiki_space | create | name | description |
| 修改空间设置 | feishu_wiki_space | update_setting | space_id | create_setting, export_setting, comment_setting |
| 列出空间节点 | feishu_wiki_space_node | list | space_id | parent_node_token |
| 获取节点详情 | feishu_wiki_space_node | get | space_id, node_token | - |
| 创建节点 | feishu_wiki_space_node | create | space_id, obj_type | parent_node_token, title |
| 移动节点 | feishu_wiki_space_node | move | space_id, node_token | target_parent_token |
| 复制节点 | feishu_wiki_space_node | copy | space_id, node_token | target_space_id, title |
| 将云文档移入知识库 | feishu_wiki_space_node | move_docs_to_wiki | space_id, obj_type, obj_token | parent_wiki_token, apply |
| 查看空间成员 | feishu_wiki_space_member | get | space_id | - |
| 添加空间成员 | feishu_wiki_space_member | add | space_id, member_type, member_id, role | - |
| 删除空间成员 | feishu_wiki_space_member | delete | space_id, member_type, member_id | - |

---

## 🎯 核心约束

### 1. obj_type 文档类型

| 值 | 说明 |
|----|------|
| `doc` | 旧版文档 |
| `docx` | 新版文档（推荐）|
| `sheet` | 电子表格 |
| `bitable` | 多维表格 |
| `mindnote` | 思维笔记 |
| `file` | 文件 |

### 2. move_docs_to_wiki 说明

- `apply: false`（默认）：强制移动，需要文档所有者权限
- `apply: true`：仅申请移动，等待所有协作者同意
- 移动后原文档链接自动跳转到知识库

### 3. 空间设置权限值

- `admin`：仅管理员
- `member`：所有成员
