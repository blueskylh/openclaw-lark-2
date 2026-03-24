---
name: feishu-chat
description: |
  飞书群组（Chat）管理工具。支持搜索/查看/创建/更新群组，管理群成员，查询群公告，检查用户是否在群中。

  **当以下情况时使用此 Skill**:
  (1) 用户提到「群」「群组」「群聊」「chat」
  (2) 需要创建、查找、修改群信息
  (3) 需要添加或移除群成员
  (4) 需要查看群公告
  (5) 需要判断某人是否在某个群里
---

# 飞书群组管理

## 🚨 执行前必读

- ✅ **chat_id**：群 ID，格式 `oc_xxx`，通过 `search` 或 `list` 获取
- ✅ **user_id**：用户 open_id，格式 `ou_xxx`
- ⚠️ **disband 不可逆**：解散群后数据无法恢复，执行前务必确认

---

## 📋 快速索引：意图 → 工具 → 必填参数

| 用户意图 | 工具 | action | 必填参数 | 常用可选 |
|---------|------|--------|---------|----------|
| 搜索群组 | feishu_chat | search | query | page_size |
| 获取群详情 | feishu_chat | get | chat_id | - |
| 列出我的群 | feishu_chat | list | - | page_size |
| 创建群 | feishu_chat | create | name | user_ids[], description, owner_id |
| 更新群信息 | feishu_chat | update | chat_id | name, description, owner_id |
| 解散群 | feishu_chat | disband | chat_id | - |
| 查看群公告 | feishu_chat | get_announcement | chat_id | - |
| 检查用户是否在群中 | feishu_chat | is_member | chat_id, member_id | member_id_type |
| 查看群成员 | feishu_chat_members | get | chat_id | - |
| 添加群成员 | feishu_chat_members | add | chat_id, id_list[] | - |
| 移除群成员 | feishu_chat_members | remove | chat_id, id_list[] | - |

---

## 🎯 核心约束

### 1. is_member 用法

```json
{ "action": "is_member", "chat_id": "oc_xxx", "member_id": "ou_xxx" }
```

返回 `is_member: true/false`。

### 2. 群模式

- `group`：普通群组（默认）
- `topic`：话题群

### 3. 添加成员权限

- `all_members`：所有成员可添加人
- `only_owner`：仅群主和管理员可添加
