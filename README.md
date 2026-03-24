# OpenClaw 飞书插件（个人增强版）

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-blue.svg)](https://nodejs.org/)

> ⚠️ **声明：这不是官方插件**
>
> 本项目是基于 [larksuite/openclaw-lark](https://github.com/larksuite/openclaw-larksuite) 官方插件的个人二次开发版本，由个人自用，与飞书官方和 OpenClaw 官方**没有任何关联**。
> 官方插件请访问原始仓库。本项目所有改动均在 MIT 许可证范围内进行。

---

## 简介

本插件将 OpenClaw Agent 接入飞书工作区，使 AI 能够直接操作飞书消息、文档、多维表格、日历、任务、群组等能力。

本个人版在官方版基础上扩展了更多 API 功能，主要针对**超级个体（Solopreneur）**的工作场景：构建以个人技能和生活方式为核心的盈利系统，用 AI 代劳重复性工作。

---

## 功能列表

| 类别 | 能力 |
|------|------|
| 💬 消息 | 消息读取、发送、回复、搜索、图片/文件下载 |
| 🔍 搜索 | 搜索文档/Wiki、**搜索消息（新增）** |
| 📄 文档 | 创建、更新、读取云文档 |
| 📊 多维表格 | 数据表、字段、记录（增删改查/批量操作）、视图 |
| 📈 电子表格 | 创建、编辑、查看、导出、**工作表管理（新增）**、**行列操作（新增）** |
| 📅 日历 | **日历管理（创建/更新/删除/搜索，新增）**、日程管理、参会人管理、忙闲查询、**请假日程（新增）** |
| ✅ 任务 | 任务管理（增删改查/成员/清单/提醒/**依赖，新增**）、清单、子任务、评论、**自定义分组（新增）** |
| 👥 群组 | 搜索/获取群详情、**列出所在群/创建群/更新群/解散群/判断是否在群（新增）** |
| 🎯 OKR | **OKR 周期/目标/关键结果查询、进展记录（新增）** |
| 👤 群成员 | 获取成员列表、**拉入成员/移出成员（新增）** |
| 🗂️ 云盘 | 文件列表、获取元信息、复制、移动、删除、上传、下载、**文件夹管理（新增）**、**搜索云文档（新增）** |
| 📖 知识库 | 空间管理（**设置更新，新增**）、节点管理（**移动云文档至知识库，新增**）、**空间成员管理（新增）** |

---

## 更新日志

### 2026-03-23（个人增强版）

**新增功能（相对官方版）：**

- **群组管理**（`feishu_chat`）
  - `list`：获取用户或机器人所在的所有群列表
  - `create`：创建群
  - `update`：更新群信息
  - `disband`：解散群（不可逆）
  - `get_announcement`：获取群公告信息

- **群成员管理**（`feishu_chat_members`）
  - `add`：将用户或机器人拉入群聊
  - `remove`：将用户或机器人移出群聊

- **消息搜索**（`feishu_search_message`）
  - 按关键词搜索消息，支持发送者、会话、消息类型、时间范围等多维过滤

- **日历管理**（`feishu_calendar_calendar`）
  - `create`：创建共享日历
  - `update`：更新日历信息
  - `delete`：删除共享日历
  - `search`：按关键词搜索日历

- **日程参会人管理**（`feishu_calendar_event_attendee`）
  - `delete`：删除日程参会人

- **任务管理**（`feishu_task_task`）
  - `delete`：删除任务
  - `add_members`：添加任务成员
  - `remove_members`：移除任务成员
  - `add_tasklist`：将任务加入清单
  - `remove_tasklist`：将任务移出清单
  - `add_reminder`：添加任务提醒
  - `remove_reminder`：移除任务提醒
  - `add_dependency`：添加任务依赖（前置/后置任务）
  - `remove_dependency`：移除任务依赖

- **任务清单管理**（`feishu_task_tasklist`）
  - `delete`：删除清单
  - `remove_members`：移除清单成员

- **任务评论管理**（`feishu_task_comment`）
  - `update`：更新评论
  - `delete`：删除评论

- **OKR 管理**（`feishu_okr`）
  - `list_periods`：获取 OKR 周期列表
  - `list`：获取用户的 OKR 列表
  - `get`：批量获取 OKR 详情（含目标和关键结果）
  - `add_progress`：创建进展记录
  - `update_progress`：更新进展记录
  - `get_progress`：获取进展记录详情
  - `delete_progress`：删除进展记录

- **任务附件管理**（`feishu_task_attachment`）
  - `list`：列取任务的附件列表
  - `get`：获取附件详情（含临时下载链接，有效 3 分钟）
  - `delete`：删除附件

- **任务自定义字段管理**（`feishu_task_custom_field`）
  - `create`：创建自定义字段（支持数字/成员/日期/单选/多选/文本类型）
  - `update`：更新自定义字段名称或设置
  - `get`：获取自定义字段详情
  - `list`：列取清单下的所有自定义字段
  - `add_to_resource`：将自定义字段加入清单
  - `remove_from_resource`：将自定义字段从清单移出
  - `create_option`：为单选/多选字段创建新选项
  - `update_option`：更新选项名称、颜色或顺序

- **任务自定义分组管理**（`feishu_task_section`）
  - `create`：在清单或「我的任务」中创建分组
  - `get`：获取分组详情
  - `list`：列取分组列表
  - `patch`：更新分组名称或顺序
  - `delete`：删除分组

- **电子表格工作表管理**（`feishu_sheet`）
  - `sheet_add`：新增工作表
  - `sheet_delete`：删除工作表
  - `sheet_rename`：重命名工作表
  - `row_col_insert`：插入行或列
  - `row_col_delete`：删除行或列

- **知识库空间成员管理**（`feishu_wiki_space_member`）
  - `list`：获取知识空间成员列表
  - `add`：添加成员或管理员
  - `delete`：移除成员

- **云空间文件夹及搜索**（`feishu_drive_folder`）
  - `create`：新建文件夹
  - `list`：获取文件夹内容清单
  - `search`：按关键词搜索云文档

- **日历请假日程**（`feishu_calendar_event`）
  - `create_leave`：为用户创建请假日程（支持全天/半天）
  - `delete_leave`：删除请假日程

- **群组扩展**（`feishu_chat`）
  - `is_member`：判断指定用户或机器人是否在群内

- **任务依赖**（`feishu_task_task`）
  - `add_dependency`：为任务添加前置或后置依赖任务
  - `remove_dependency`：移除任务依赖

- **知识库空间设置**（`feishu_wiki_space`）
  - `update_setting`：更新知识空间的创建权限、安全设置、评论设置

- **云文档移入知识库**（`feishu_wiki_space_node`）
  - `move_docs_to_wiki`：将云空间中的文档移动到知识空间

---

本插件对接 OpenClaw AI 自动化能力，存在模型幻觉、执行不可控、提示词注入等固有风险。授权飞书权限后，OpenClaw 将以您的用户身份在授权范围内执行操作，可能导致敏感数据泄露、越权操作等高风险后果，请谨慎使用。

建议将接入 OpenClaw 的飞书机器人作为私人对话助手使用，不要将其拉入公共群聊。

**免责声明：** 本软件代码采用 MIT 许可证。调用飞书 API 需遵守[飞书用户服务协议](https://www.feishu.cn/terms)和[飞书隐私政策](https://www.feishu.cn/privacy)。

---

## 环境要求

- **Node.js** `v22` 或更高版本（`node -v` 查看）
- **OpenClaw** 已安装，版本 `>= 2026.2.26`（`openclaw -v` 查看）

升级 OpenClaw：
```bash
npm install -g openclaw
```

---

## 编译与安装教程

### 第一步：克隆代码

```bash
git clone https://github.com/blueskylh/openclaw-lark-2.git
cd openclaw-lark-2
```

### 第二步：安装依赖

```bash
npm install
```

### 第三步：编译

```bash
npm run build
```

### 第四步：在 OpenClaw 中加载本地插件

```bash
openclaw plugins install /path/to/openclaw-lark-2
```

加载后重启 OpenClaw 网关使配置生效：

```bash
openclaw gateway restart
```

### 第四步：配置飞书账号

参考 [OpenClaw 飞书官方插件使用指南](https://bytedance.larkoffice.com/docx/MFK7dDFLFoVlOGxWCv5cTXKmnMh) 完成飞书机器人创建和账号配置。

---

## 飞书应用权限说明

使用新增功能需要在飞书开放平台为应用额外申请以下权限：

| 功能 | 需要的权限 |
|------|----------|
| 搜索消息 | `search:message` |
| 创建/解散群 | `im:chat`、`im:chat:create` |
| 获取群列表 | `im:chat:read` |
| 拉入/移出群成员 | `im:chat`、`im:chat.members:write_only` |
| 创建/删除日历 | `calendar:calendar:create`、`calendar:calendar:delete` |
| 更新日历 | `calendar:calendar:update` |
| 删除任务 | `task:task:write` |
| 查看任务附件 | `task:attachment:read` |
| 删除任务附件 | `task:attachment:write` |
| 创建/更新自定义字段 | `task:custom_field:write` |
| 查看自定义字段 | `task:custom_field:read` |
| 工作表管理（增删改） | `sheets:spreadsheet:write_only` |
| 知识库空间成员-查看 | `wiki:member:retrieve` |
| 知识库空间成员-添加 | `wiki:member:create` |
| 知识库空间成员-删除 | `wiki:member:delete` |
| 创建文件夹 | `space:folder:create` |
| 查看 OKR | `okr:okr:readonly` |
| 写入 OKR 进展 | `okr:okr.progress:writeonly` |
| 删除 OKR 进展 | `okr:okr.progress:delete` |
| 创建/更新自定义字段选项 | `task:custom_field:write` |
| 任务自定义分组管理 | `task:task:write`、`task:task:read` |
| 任务依赖管理 | `task:task:write` |
| 创建/删除请假日程 | `calendar:timeoff_event:write` |
| 判断用户是否在群 | `im:chat:read` |
| 知识库空间设置更新 | `wiki:wiki:write` |
| 移动云文档至知识库 | `wiki:wiki:write` |

---

## 未实现的功能（后续可扩展）

以下是飞书开放平台中**对超级个体有价值**、但本插件尚未实现的功能，供后续按需扩展：

### 推荐优先实现

| 模块 | 价值说明 | 主要 API |
|------|----------|----------|
| 📋 **审批** | 自动提交/查询审批单，代劳重复申请流程 | 创建审批实例、查询审批列表 |
| 📝 **汇报** | 创建/查看工作汇报，让 AI 自动生成并提交周报 | 创建汇报、获取汇报列表 |
| 🎙️ **妙记** | 会议录音转录，提取会议摘要和行动项 | 获取妙记列表、获取转写内容 |

### 可选实现

| 模块 | 价值说明 |
|------|----------|
| 📧 **邮箱** | 读取/发送飞书邮件（需使用飞书邮箱） |
| 📹 **视频会议** | 创建/查询会议室预定 |
| 📖 **飞书词典** | 维护团队/个人术语知识库 |
| 🤖 **飞书 Aily** | 调用飞书内置 AI 技能、执行知识问答 |
| 👥 **通讯录** | 搜索同事信息、查询部门架构（基础功能已有） |
| ⏰ **考勤打卡** | 查看打卡记录和假期余额 |

### 企业向（个人一般不需要）

飞书人事、绩效、安全合规、管理后台、aPaaS、主数据、关联组织等模块主要面向企业 HR/IT 管理，超级个体场景下基本用不到。

---

## 开发说明

项目结构：

```
src/
  core/          # 核心模块（认证、scope 管理、客户端）
  tools/oapi/    # 各功能工具实现
    calendar/    # 日历相关工具
    chat/        # 群组相关工具
    search/      # 搜索相关工具
    task/        # 任务相关工具
    drive/       # 云盘相关工具
    ...
```

新增工具时需同步更新 `src/core/tool-scopes.ts` 中的 `ToolActionKey` 类型和 `TOOL_SCOPES` scope 映射。

---

## 许可证

本项目基于 **MIT 许可证**。详情请参阅 [LICENSE](./LICENSE.md) 文件。
