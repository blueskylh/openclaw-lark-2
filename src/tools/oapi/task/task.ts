/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_task_task tool -- Manage Feishu tasks.
 *
 * P0 Actions: create, get, list, patch
 *
 * Uses the Feishu Task v2 API:
 *   - create: POST /open-apis/task/v2/tasks
 *   - get:    GET  /open-apis/task/v2/tasks/:task_guid
 *   - list:   GET  /open-apis/task/v2/tasks
 *   - patch:  PATCH /open-apis/task/v2/tasks/:task_guid
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import {
  json,
  createToolContext,
  parseTimeToTimestampMs,
  assertLarkOk,
  handleInvokeErrorWithAutoAuth,
  registerTool,
  StringEnum,
} from '../helpers';
import type { PaginatedData, TaskCreateData } from '../sdk-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuTaskTaskSchema = Type.Union([
  // CREATE
  Type.Object({
    action: Type.Literal('create'),
    summary: Type.String({
      description: '任务标题',
    }),
    current_user_id: Type.Optional(
      Type.String({
        description:
          '当前用户的 open_id（强烈建议，从消息上下文的 SenderId 获取）。如果 members 中不包含此用户，工具会自动添加为 follower，确保创建者可以编辑任务。',
      }),
    ),
    description: Type.Optional(
      Type.String({
        description: '任务描述',
      }),
    ),
    due: Type.Optional(
      Type.Object({
        timestamp: Type.String({
          description: "截止时间（ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'）",
        }),
        is_all_day: Type.Optional(
          Type.Boolean({
            description: '是否为全天任务',
          }),
        ),
      }),
    ),
    start: Type.Optional(
      Type.Object({
        timestamp: Type.String({
          description: "开始时间（ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'）",
        }),
        is_all_day: Type.Optional(
          Type.Boolean({
            description: '是否为全天',
          }),
        ),
      }),
    ),
    members: Type.Optional(
      Type.Array(
        Type.Object({
          id: Type.String({
            description: '成员 open_id',
          }),
          role: Type.Optional(StringEnum(['assignee', 'follower'])),
        }),
        {
          description: '任务成员列表（assignee=负责人，follower=关注人）',
        },
      ),
    ),
    repeat_rule: Type.Optional(
      Type.String({
        description: '重复规则（RRULE 格式）',
      }),
    ),
    tasklists: Type.Optional(
      Type.Array(
        Type.Object({
          tasklist_guid: Type.String({
            description: '清单 GUID',
          }),
          section_guid: Type.Optional(
            Type.String({
              description: '分组 GUID',
            }),
          ),
        }),
        {
          description: '任务所属清单列表',
        },
      ),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id']),
    ),
  }),

  // GET
  Type.Object({
    action: Type.Literal('get'),
    task_guid: Type.String({
      description: 'Task GUID',
    }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id']),
    ),
  }),

  // LIST
  Type.Object({
    action: Type.Literal('list'),
    page_size: Type.Optional(
      Type.Number({
        description: '每页数量（默认 50，最大 100）。',
      }),
    ),
    page_token: Type.Optional(
      Type.String({
        description: '分页标记',
      }),
    ),
    completed: Type.Optional(
      Type.Boolean({
        description: '是否筛选已完成任务',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id']),
    ),
  }),

  // PATCH
  Type.Object({
    action: Type.Literal('patch'),
    task_guid: Type.String({
      description: 'Task GUID',
    }),
    summary: Type.Optional(
      Type.String({
        description: '新的任务标题',
      }),
    ),
    description: Type.Optional(
      Type.String({
        description: '新的任务描述',
      }),
    ),
    due: Type.Optional(
      Type.Object({
        timestamp: Type.String({
          description: "新的截止时间（ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'）",
        }),
        is_all_day: Type.Optional(
          Type.Boolean({
            description: '是否为全天任务',
          }),
        ),
      }),
    ),
    start: Type.Optional(
      Type.Object({
        timestamp: Type.String({
          description: "新的开始时间（ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'）",
        }),
        is_all_day: Type.Optional(
          Type.Boolean({
            description: '是否为全天',
          }),
        ),
      }),
    ),
    completed_at: Type.Optional(
      Type.String({
        description:
          "完成时间。支持三种格式：1) ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'（设为已完成）；2) '0'（反完成，任务变为未完成）；3) 毫秒时间戳字符串。",
      }),
    ),
    members: Type.Optional(
      Type.Array(
        Type.Object({
          id: Type.String({
            description: '成员 open_id',
          }),
          role: Type.Optional(StringEnum(['assignee', 'follower'])),
        }),
        {
          description: '新的任务成员列表',
        },
      ),
    ),
    repeat_rule: Type.Optional(
      Type.String({
        description: '新的重复规则（RRULE 格式）',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id']),
    ),
  }),

  // DELETE
  Type.Object({
    action: Type.Literal('delete'),
    task_guid: Type.String({
      description: '要删除的任务 GUID',
    }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id']),
    ),
  }),

  // ADD_MEMBERS
  Type.Object({
    action: Type.Literal('add_members'),
    task_guid: Type.String({ description: '任务 GUID' }),
    members: Type.Array(
      Type.Object({
        id: Type.String({ description: '成员 open_id' }),
        role: Type.Optional(StringEnum(['assignee', 'follower'])),
      }),
      { description: '要添加的成员列表' },
    ),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // REMOVE_MEMBERS
  Type.Object({
    action: Type.Literal('remove_members'),
    task_guid: Type.String({ description: '任务 GUID' }),
    members: Type.Array(
      Type.Object({
        id: Type.String({ description: '成员 open_id' }),
        role: Type.Optional(StringEnum(['assignee', 'follower'])),
      }),
      { description: '要移除的成员列表' },
    ),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // ADD_TASKLIST（任务加入清单）
  Type.Object({
    action: Type.Literal('add_tasklist'),
    task_guid: Type.String({ description: '任务 GUID' }),
    tasklist_guid: Type.String({ description: '要加入的清单 GUID' }),
    section_guid: Type.Optional(Type.String({ description: '清单中的自定义分组 GUID（不填则加入默认分组）' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // REMOVE_TASKLIST（任务移出清单）
  Type.Object({
    action: Type.Literal('remove_tasklist'),
    task_guid: Type.String({ description: '任务 GUID' }),
    tasklist_guid: Type.String({ description: '要移出的清单 GUID' }),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // ADD_REMINDER（添加提醒）
  Type.Object({
    action: Type.Literal('add_reminder'),
    task_guid: Type.String({ description: '任务 GUID' }),
    relative_fire_minute: Type.Integer({
      description: '相对截止时间的提醒分钟数。只允许非负整数：0=截止时提醒，正数=截止后N分钟提醒（如 30 表示截止后30分钟）。每个任务最多1个提醒。',
    }),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // REMOVE_REMINDER（移除提醒）
  Type.Object({
    action: Type.Literal('remove_reminder'),
    task_guid: Type.String({ description: '任务 GUID' }),
    reminder_id: Type.String({ description: '提醒 ID（可通过 get action 查看任务详情中的 reminders 字段获取）' }),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'])),
  }),

  // ADD_DEPENDENCY（添加任务依赖）
  Type.Object({
    action: Type.Literal('add_dependency'),
    task_guid: Type.String({ description: '任务 GUID' }),
    dependencies: Type.Array(
      Type.Object({
        type: StringEnum(['prev', 'next'], { description: '依赖类型：prev=前置任务（本任务依赖它），next=后置任务（它依赖本任务）' }),
        task_guid: Type.String({ description: '依赖的任务 GUID' }),
      }),
      { description: '要添加的依赖关系列表' },
    ),
  }),

  // REMOVE_DEPENDENCY（移除任务依赖）
  Type.Object({
    action: Type.Literal('remove_dependency'),
    task_guid: Type.String({ description: '任务 GUID' }),
    dependencies: Type.Array(
      Type.Object({
        type: StringEnum(['prev', 'next'], { description: '依赖类型：prev=前置任务，next=后置任务' }),
        task_guid: Type.String({ description: '依赖的任务 GUID' }),
      }),
      { description: '要移除的依赖关系列表' },
    ),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuTaskTaskParams =
  | {
      action: 'create';
      summary: string;
      current_user_id?: string;
      description?: string;
      due?: {
        timestamp: string;
        is_all_day?: boolean;
      };
      start?: {
        timestamp: string;
        is_all_day?: boolean;
      };
      members?: Array<{
        id: string;
        role?: 'assignee' | 'follower';
      }>;
      repeat_rule?: string;
      tasklists?: Array<{
        tasklist_guid: string;
        section_guid?: string;
      }>;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'get';
      task_guid: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'list';
      page_size?: number;
      page_token?: string;
      completed?: boolean;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'patch';
      task_guid: string;
      summary?: string;
      description?: string;
      due?: {
        timestamp: string;
        is_all_day?: boolean;
      };
      start?: {
        timestamp: string;
        is_all_day?: boolean;
      };
      completed_at?: string;
      members?: Array<{
        id: string;
        role?: 'assignee' | 'follower';
      }>;
      repeat_rule?: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'delete';
      task_guid: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'add_members';
      task_guid: string;
      members: Array<{ id: string; role?: 'assignee' | 'follower' }>;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'remove_members';
      task_guid: string;
      members: Array<{ id: string; role?: 'assignee' | 'follower' }>;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'add_tasklist';
      task_guid: string;
      tasklist_guid: string;
      section_guid?: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'remove_tasklist';
      task_guid: string;
      tasklist_guid: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'add_reminder';
      task_guid: string;
      relative_fire_minute: number;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'remove_reminder';
      task_guid: string;
      reminder_id: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'add_dependency';
      task_guid: string;
      dependencies: Array<{ type: 'prev' | 'next'; task_guid: string }>;
    }
  | {
      action: 'remove_dependency';
      task_guid: string;
      dependencies: Array<{ type: 'prev' | 'next'; task_guid: string }>;
    };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFeishuTaskTaskTool(api: OpenClawPluginApi) {
  if (!api.config) return;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_task_task');

  registerTool(
    api,
    {
      name: 'feishu_task_task',
      label: 'Feishu Task Management',
      description:
        "【以用户身份】飞书任务管理工具。Actions: create（创建任务）, get（获取任务详情）, list（查询任务列表）, patch（更新任务）, delete（删除任务）, add_members（添加成员）, remove_members（移除成员）, add_tasklist（加入清单）, remove_tasklist（移出清单）, add_reminder（添加提醒）, remove_reminder（移除提醒）, add_dependency（添加任务依赖）, remove_dependency（移除任务依赖）。时间参数使用ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'。",
      parameters: FeishuTaskTaskSchema,
      async execute(_toolCallId: string, params: unknown) {
        const p = params as FeishuTaskTaskParams;
        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // CREATE TASK
            // -----------------------------------------------------------------
            case 'create': {
              log.info(`create: summary=${p.summary}`);

              const taskData: any = {
                summary: p.summary,
              };

              if (p.description) taskData.description = p.description;

              // Handle due time conversion
              if (p.due?.timestamp) {
                const dueTs = parseTimeToTimestampMs(p.due.timestamp);
                if (!dueTs) {
                  return json({
                    error:
                      "due 时间格式错误！必须使用ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'，例如 '2026-02-25 18:00'。",
                    received: p.due.timestamp,
                  });
                }
                taskData.due = {
                  timestamp: dueTs,
                  is_all_day: p.due.is_all_day ?? false,
                };
                log.info(`create: due time converted: ${p.due.timestamp} -> ${dueTs}ms`);
              }

              // Handle start time conversion
              if (p.start?.timestamp) {
                const startTs = parseTimeToTimestampMs(p.start.timestamp);
                if (!startTs) {
                  return json({
                    error:
                      "start 时间格式错误！必须使用ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'。",
                    received: p.start.timestamp,
                  });
                }
                taskData.start = {
                  timestamp: startTs,
                  is_all_day: p.start.is_all_day ?? false,
                };
              }

              if (p.members) taskData.members = p.members;
              if (p.repeat_rule) taskData.repeat_rule = p.repeat_rule;
              if (p.tasklists) taskData.tasklists = p.tasklists;

              const res = await client.invoke(
                'feishu_task_task.create',
                (sdk, opts) =>
                  sdk.task.v2.task.create(
                    {
                      data: taskData,
                      params: {
                        user_id_type: (p.user_id_type || 'open_id') as any,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              const data = res.data as TaskCreateData | undefined;
              log.info(`create: task created: task_guid=${data?.task?.guid}`);

              return json({
                task: res.data?.task,
              });
            }

            // -----------------------------------------------------------------
            // GET TASK
            // -----------------------------------------------------------------
            case 'get': {
              log.info(`get: task_guid=${p.task_guid}`);

              const res = await client.invoke(
                'feishu_task_task.get',
                (sdk, opts) =>
                  sdk.task.v2.task.get(
                    {
                      path: { task_guid: p.task_guid },
                      params: {
                        user_id_type: (p.user_id_type || 'open_id') as any,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`get: retrieved task ${p.task_guid}`);

              return json({
                task: res.data?.task,
              });
            }

            // -----------------------------------------------------------------
            // LIST TASKS
            // -----------------------------------------------------------------
            case 'list': {
              log.info(`list: page_size=${p.page_size ?? 50}, completed=${p.completed ?? false}`);

              const res = await client.invoke(
                'feishu_task_task.list',
                (sdk, opts) =>
                  sdk.task.v2.task.list(
                    {
                      params: {
                        page_size: p.page_size,
                        page_token: p.page_token,
                        completed: p.completed,
                        user_id_type: (p.user_id_type || 'open_id') as any,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              const data = res.data as PaginatedData | undefined;
              log.info(`list: returned ${data?.items?.length ?? 0} tasks`);

              return json({
                tasks: data?.items,
                has_more: data?.has_more ?? false,
                page_token: data?.page_token,
              });
            }

            // -----------------------------------------------------------------
            // PATCH TASK
            // -----------------------------------------------------------------
            case 'patch': {
              log.info(`patch: task_guid=${p.task_guid}`);

              const updateData: any = {};

              if (p.summary) updateData.summary = p.summary;
              if (p.description !== undefined) updateData.description = p.description;

              // Handle due time conversion
              if (p.due?.timestamp) {
                const dueTs = parseTimeToTimestampMs(p.due.timestamp);
                if (!dueTs) {
                  return json({
                    error:
                      "due 时间格式错误！必须使用ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'。",
                    received: p.due.timestamp,
                  });
                }
                updateData.due = {
                  timestamp: dueTs,
                  is_all_day: p.due.is_all_day ?? false,
                };
              }

              // Handle start time conversion
              if (p.start?.timestamp) {
                const startTs = parseTimeToTimestampMs(p.start.timestamp);
                if (!startTs) {
                  return json({
                    error:
                      "start 时间格式错误！必须使用ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'。",
                    received: p.start.timestamp,
                  });
                }
                updateData.start = {
                  timestamp: startTs,
                  is_all_day: p.start.is_all_day ?? false,
                };
              }

              // Handle completed_at conversion
              if (p.completed_at !== undefined) {
                // 特殊值：反完成（设为未完成）
                if (p.completed_at === '0') {
                  updateData.completed_at = '0';
                }
                // 数字字符串时间戳（直通）
                else if (/^\d+$/.test(p.completed_at)) {
                  updateData.completed_at = p.completed_at;
                }
                // 时间格式字符串（需要转换）
                else {
                  const completedTs = parseTimeToTimestampMs(p.completed_at);
                  if (!completedTs) {
                    return json({
                      error:
                        "completed_at 格式错误！支持：1) ISO 8601 / RFC 3339 格式（包含时区），例如 '2024-01-01T00:00:00+08:00'；2) '0'（反完成）；3) 毫秒时间戳字符串。",
                      received: p.completed_at,
                    });
                  }
                  updateData.completed_at = completedTs;
                }
              }

              if (p.members) updateData.members = p.members;
              if (p.repeat_rule) updateData.repeat_rule = p.repeat_rule;

              // Build update_fields list (required by Task API)
              const updateFields = Object.keys(updateData);

              const res = await client.invoke(
                'feishu_task_task.patch',
                (sdk, opts) =>
                  sdk.task.v2.task.patch(
                    {
                      path: { task_guid: p.task_guid },
                      data: {
                        task: updateData,
                        update_fields: updateFields,
                      },
                      params: {
                        user_id_type: (p.user_id_type || 'open_id') as any,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`patch: task ${p.task_guid} updated`);

              return json({
                task: res.data?.task,
              });
            }

            // -----------------------------------------------------------------
            // DELETE TASK
            // -----------------------------------------------------------------
            case 'delete': {
              log.info(`delete: task_guid=${p.task_guid}`);

              const res = await client.invoke(
                'feishu_task_task.delete',
                (sdk: any, opts: any) =>
                  sdk.task.v2.task.delete(
                    {
                      path: { task_guid: p.task_guid },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`delete: task ${p.task_guid} deleted`);

              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // ADD_MEMBERS
            // -----------------------------------------------------------------
            case 'add_members': {
              log.info(`add_members: task_guid=${p.task_guid}, count=${p.members.length}`);

              const res = await client.invoke(
                'feishu_task_task.add_members',
                (sdk, opts) =>
                  sdk.task.v2.task.addMembers(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: {
                        members: p.members.map((m) => ({ id: m.id, type: 'user', role: m.role || 'assignee' })),
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ task: res.data?.task });
            }

            // -----------------------------------------------------------------
            // REMOVE_MEMBERS
            // -----------------------------------------------------------------
            case 'remove_members': {
              log.info(`remove_members: task_guid=${p.task_guid}, count=${p.members.length}`);

              const res = await client.invoke(
                'feishu_task_task.remove_members',
                (sdk, opts) =>
                  sdk.task.v2.task.removeMembers(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: {
                        members: p.members.map((m) => ({ id: m.id, type: 'user', role: m.role || 'assignee' })),
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ task: res.data?.task });
            }

            // -----------------------------------------------------------------
            // ADD_TASKLIST（任务加入清单）
            // -----------------------------------------------------------------
            case 'add_tasklist': {
              log.info(`add_tasklist: task_guid=${p.task_guid}, tasklist_guid=${p.tasklist_guid}`);

              const res = await client.invoke(
                'feishu_task_task.add_tasklist',
                (sdk, opts) =>
                  sdk.task.v2.task.addTasklist(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: {
                        tasklist_guid: p.tasklist_guid,
                        section_guid: p.section_guid,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ task: res.data?.task });
            }

            // -----------------------------------------------------------------
            // REMOVE_TASKLIST（任务移出清单）
            // -----------------------------------------------------------------
            case 'remove_tasklist': {
              log.info(`remove_tasklist: task_guid=${p.task_guid}, tasklist_guid=${p.tasklist_guid}`);

              const res = await client.invoke(
                'feishu_task_task.remove_tasklist',
                (sdk, opts) =>
                  sdk.task.v2.task.removeTasklist(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: { tasklist_guid: p.tasklist_guid },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // ADD_REMINDER（添加提醒）
            // -----------------------------------------------------------------
            case 'add_reminder': {
              log.info(`add_reminder: task_guid=${p.task_guid}, relative_fire_minute=${p.relative_fire_minute}`);

              const res = await client.invoke(
                'feishu_task_task.add_reminder',
                (sdk, opts) =>
                  sdk.task.v2.task.addReminders(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: {
                        reminders: [{ relative_fire_minute: p.relative_fire_minute }],
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ task: res.data?.task });
            }

            // -----------------------------------------------------------------
            // REMOVE_REMINDER（移除提醒）
            // -----------------------------------------------------------------
            case 'remove_reminder': {
              log.info(`remove_reminder: task_guid=${p.task_guid}, reminder_id=${p.reminder_id}`);

              const res = await client.invoke(
                'feishu_task_task.remove_reminder',
                (sdk, opts) =>
                  sdk.task.v2.task.removeReminders(
                    {
                      path: { task_guid: p.task_guid },
                      params: { user_id_type: (p.user_id_type || 'open_id') as any },
                      data: { reminder_ids: [p.reminder_id] },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              return json({ task: res.data?.task });
            }

            // -----------------------------------------------------------------
            // ADD_DEPENDENCY（添加任务依赖）
            // -----------------------------------------------------------------
            case 'add_dependency': {
              log.info(`add_dependency: task_guid=${p.task_guid}, count=${p.dependencies.length}`);

              const res = await client.invoke(
                'feishu_task_task.add_dependency',
                (sdk: any, opts: any) =>
                  sdk.task.v2.task.addDependencies(
                    {
                      path: { task_guid: p.task_guid },
                      data: { dependencies: p.dependencies },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              return json({ dependencies: (res as any).data?.dependencies });
            }

            // -----------------------------------------------------------------
            // REMOVE_DEPENDENCY（移除任务依赖）
            // -----------------------------------------------------------------
            case 'remove_dependency': {
              log.info(`remove_dependency: task_guid=${p.task_guid}, count=${p.dependencies.length}`);

              const res = await client.invoke(
                'feishu_task_task.remove_dependency',
                (sdk: any, opts: any) =>
                  sdk.task.v2.task.removeDependencies(
                    {
                      path: { task_guid: p.task_guid },
                      data: { dependencies: p.dependencies },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              return json({ success: true });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_task_task' },
  );

}
