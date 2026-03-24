---
name: feishu-okr
description: |
  飞书 OKR 查询与进展管理工具。支持查询 OKR 周期、查看目标列表、获取详情、添加/更新/删除进展记录。

  **当以下情况时使用此 Skill**:
  (1) 用户提到「OKR」「目标」「Key Result」「KR」「进展」
  (2) 需要查看自己或他人的 OKR
  (3) 需要更新 O 或 KR 的进展
  (4) 需要查询 OKR 周期列表
---

# 飞书 OKR 管理

## 🚨 执行前必读

- ✅ **周期 ID**：通过 `list_periods` 获取，再用于 `list` 过滤
- ✅ **OKR ID**：通过 `list` 获取，再用于 `get` 或 `add_progress`
- ✅ **目标类型**：`2` = O（Objective），`3` = KR（Key Result）
- ✅ **不填 user_id**：默认查询当前用户自己的 OKR

---

## 📋 快速索引：意图 → 工具 → 必填参数

| 用户意图 | 工具 | action | 必填参数 | 常用可选 |
|---------|------|--------|---------|----------|
| 查看 OKR 周期列表 | feishu_okr | list_periods | - | page_size |
| 查看自己的 OKR | feishu_okr | list | - | period_ids[], lang |
| 查看他人的 OKR | feishu_okr | list | user_id | period_ids[] |
| 获取 OKR 详情 | feishu_okr | get | okr_ids[] | lang |
| 添加进展 | feishu_okr | add_progress | target_id, target_type, content_text | source_title |
| 更新进展 | feishu_okr | update_progress | progress_id, content_text | - |
| 查看进展详情 | feishu_okr | get_progress | progress_id | - |
| 删除进展 | feishu_okr | delete_progress | progress_id | - |

---

## 🎯 核心约束

### 1. 典型查询流程

```
list_periods → 获取周期 ID → list（传 period_ids）→ 获取 OKR ID → get（详情）
```

### 2. 进展内容

- `content_text`：纯文本，AI 可根据上下文自动生成填写
- `target_type`：2 = Objective，3 = Key Result
- `target_id`：从 `list` / `get` 返回值中获取 O 或 KR 的 ID

### 3. 权限说明

- 查看他人 OKR 需要对方已公开权限
- 添加进展只能操作自己的 OKR
