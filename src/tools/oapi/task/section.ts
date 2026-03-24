/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_task_section tool -- 任务自定义分组管理
 *
 * Actions:
 *   - create: 创建自定义分组
 *   - get:    获取自定义分组详情
 *   - list:   列取自定义分组
 *   - patch:  更新自定义分组
 *   - delete: 删除自定义分组
 *
 * Uses the Feishu Task v2 API:
 *   - create: POST   /open-apis/task/v2/sections
 *   - get:    GET    /open-apis/task/v2/sections/:section_guid
 *   - list:   GET    /open-apis/task/v2/sections
 *   - patch:  PATCH  /open-apis/task/v2/sections/:section_guid
 *   - delete: DELETE /open-apis/task/v2/sections/:section_guid
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import { json, createToolContext, assertLarkOk, handleInvokeErrorWithAutoAuth, registerTool, StringEnum } from '../helpers';
import type { PaginatedData } from '../sdk-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuTaskSectionSchema = Type.Union([
  // CREATE
  Type.Object({
    action: Type.Literal('create'),
    name: Type.String({ description: '分组名称' }),
    resource_type: StringEnum(['tasklist', 'my_tasks'], {
      description: '分组所属资源类型：tasklist（清单分组），my_tasks（我的任务分组）',
    }),
    resource_id: Type.Optional(Type.String({
      description: '资源 ID（resource_type=tasklist 时填清单 GUID；resource_type=my_tasks 时不填或填 my）',
    })),
    insert_before: Type.Optional(Type.String({ description: '插入到此分组 GUID 之前（不填则追加到末尾）' })),
    insert_after: Type.Optional(Type.String({ description: '插入到此分组 GUID 之后（不填则追加到末尾）' })),
  }),

  // GET
  Type.Object({
    action: Type.Literal('get'),
    section_guid: Type.String({ description: '分组 GUID' }),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' })),
  }),

  // LIST
  Type.Object({
    action: Type.Literal('list'),
    resource_type: StringEnum(['tasklist', 'my_tasks'], {
      description: '分组所属资源类型：tasklist（清单分组），my_tasks（我的任务分组）',
    }),
    resource_id: Type.Optional(Type.String({
      description: '资源 ID（resource_type=tasklist 时填清单 GUID；my_tasks 时不填）',
    })),
    page_size: Type.Optional(Type.Integer({ description: '分页大小（默认 50，最大 100）', minimum: 1, maximum: 100 })),
    page_token: Type.Optional(Type.String({ description: '分页标记' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' })),
  }),

  // PATCH
  Type.Object({
    action: Type.Literal('patch'),
    section_guid: Type.String({ description: '分组 GUID' }),
    name: Type.Optional(Type.String({ description: '新的分组名称' })),
    insert_before: Type.Optional(Type.String({ description: '移动到此分组 GUID 之前' })),
    insert_after: Type.Optional(Type.String({ description: '移动到此分组 GUID 之后' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' })),
  }),

  // DELETE
  Type.Object({
    action: Type.Literal('delete'),
    section_guid: Type.String({ description: '要删除的分组 GUID' }),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuTaskSectionParams =
  | {
      action: 'create';
      name: string;
      resource_type: string;
      resource_id?: string;
      insert_before?: string;
      insert_after?: string;
    }
  | { action: 'get'; section_guid: string; user_id_type?: string }
  | {
      action: 'list';
      resource_type: string;
      resource_id?: string;
      page_size?: number;
      page_token?: string;
      user_id_type?: string;
    }
  | {
      action: 'patch';
      section_guid: string;
      name?: string;
      insert_before?: string;
      insert_after?: string;
      user_id_type?: string;
    }
  | { action: 'delete'; section_guid: string };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFeishuTaskSectionTool(api: OpenClawPluginApi): void {
  if (!api.config) return;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_task_section');

  registerTool(
    api,
    {
      name: 'feishu_task_section',
      label: 'Feishu Task Section',
      description:
        '飞书任务自定义分组管理工具。清单内的分组用于对任务进行分类整理。Actions: create（创建分组）, get（获取分组详情）, list（列取分组列表）, patch（更新分组）, delete（删除分组）。',
      parameters: FeishuTaskSectionSchema,
      async execute(_toolCallId, params) {
        const p = params as FeishuTaskSectionParams;

        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // CREATE
            // -----------------------------------------------------------------
            case 'create': {
              log.info(`create: name=${p.name}, resource_type=${p.resource_type}`);

              const body: any = {
                name: p.name,
                resource_type: p.resource_type,
              };
              if (p.resource_id) body.resource_id = p.resource_id;
              if (p.insert_before) body.insert_before = p.insert_before;
              if (p.insert_after) body.insert_after = p.insert_after;

              const res = await client.invoke(
                'feishu_task_section.create',
                (sdk: any, opts: any) =>
                  sdk.task.v2.section.create({ data: body }, opts),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`create: section created: guid=${(res as any).data?.section?.guid}`);
              return json({ section: (res as any).data?.section });
            }

            // -----------------------------------------------------------------
            // GET
            // -----------------------------------------------------------------
            case 'get': {
              log.info(`get: section_guid=${p.section_guid}`);

              const res = await client.invoke(
                'feishu_task_section.get',
                (sdk: any, opts: any) =>
                  sdk.task.v2.section.get(
                    {
                      path: { section_guid: p.section_guid },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              return json({ section: (res as any).data?.section });
            }

            // -----------------------------------------------------------------
            // LIST
            // -----------------------------------------------------------------
            case 'list': {
              log.info(`list: resource_type=${p.resource_type}, resource_id=${p.resource_id}`);

              const res = await client.invoke(
                'feishu_task_section.list',
                (sdk: any, opts: any) =>
                  sdk.task.v2.section.list(
                    {
                      params: {
                        resource_type: p.resource_type,
                        resource_id: p.resource_id,
                        page_size: p.page_size,
                        page_token: p.page_token,
                        user_id_type: p.user_id_type || 'open_id',
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              const data = (res as any).data as PaginatedData | undefined;
              log.info(`list: found ${data?.items?.length ?? 0} sections`);
              return json({
                items: data?.items,
                has_more: data?.has_more ?? false,
                page_token: data?.page_token,
              });
            }

            // -----------------------------------------------------------------
            // PATCH
            // -----------------------------------------------------------------
            case 'patch': {
              log.info(`patch: section_guid=${p.section_guid}`);

              const body: any = {};
              const update_fields: string[] = [];
              if (p.name !== undefined) { body.name = p.name; update_fields.push('name'); }
              if (p.insert_before !== undefined) { body.insert_before = p.insert_before; update_fields.push('insert_before'); }
              if (p.insert_after !== undefined) { body.insert_after = p.insert_after; update_fields.push('insert_after'); }

              if (update_fields.length === 0) return json({ error: 'No fields to update' });

              const res = await client.invoke(
                'feishu_task_section.patch',
                (sdk: any, opts: any) =>
                  sdk.task.v2.section.patch(
                    {
                      path: { section_guid: p.section_guid },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                      data: { section: body, update_fields },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              return json({ section: (res as any).data?.section });
            }

            // -----------------------------------------------------------------
            // DELETE
            // -----------------------------------------------------------------
            case 'delete': {
              log.info(`delete: section_guid=${p.section_guid}`);

              const res = await client.invoke(
                'feishu_task_section.delete',
                (sdk: any, opts: any) =>
                  sdk.task.v2.section.delete(
                    { path: { section_guid: p.section_guid } },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`delete: deleted section ${p.section_guid}`);
              return json({ success: true });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_task_section' },
  );
}
