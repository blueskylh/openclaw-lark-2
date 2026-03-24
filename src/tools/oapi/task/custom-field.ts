/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_task_custom_field tool -- 任务自定义字段管理
 *
 * Actions:
 *   - create:           创建自定义字段
 *   - update:           更新自定义字段
 *   - get:              获取自定义字段详情
 *   - list:             列取自定义字段
 *   - add_to_resource:  将自定义字段加入资源
 *   - remove_from_resource: 将自定义字段移出资源
 *
 * Uses the Feishu Task v2 API:
 *   - create:              POST  /open-apis/task/v2/custom_fields
 *   - update:              PATCH /open-apis/task/v2/custom_fields/:custom_field_guid
 *   - get:                 GET   /open-apis/task/v2/custom_fields/:custom_field_guid
 *   - list:                GET   /open-apis/task/v2/custom_fields
 *   - add_to_resource:     POST  /open-apis/task/v2/custom_fields/:custom_field_guid/add
 *   - remove_from_resource:POST  /open-apis/task/v2/custom_fields/:custom_field_guid/remove
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import { json, createToolContext, assertLarkOk, handleInvokeErrorWithAutoAuth, registerTool, StringEnum } from '../helpers';
import type { PaginatedData } from '../sdk-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuTaskCustomFieldSchema = Type.Union([
  // CREATE
  Type.Object({
    action: Type.Literal('create'),
    name: Type.String({ description: '自定义字段名称' }),
    type: StringEnum(['number', 'member', 'datetime', 'single_select', 'multi_select', 'text'], {
      description: '字段类型',
    }),
    resource_type: StringEnum(['tasklist'], { description: '关联的资源类型，目前只支持 tasklist' }),
    resource_id: Type.String({ description: '关联的资源 ID（清单 GUID）' }),
    number_setting: Type.Optional(
      Type.Object({
        format: Type.Optional(Type.String({ description: '数字格式，如 normal/percentage/cny/usd/custom' })),
        decimal_count: Type.Optional(Type.Integer({ description: '小数位数（0-6）' })),
        separator: Type.Optional(Type.String({ description: '千分位分隔符，如 none/thousand' })),
        custom_symbol: Type.Optional(Type.String({ description: '自定义符号' })),
        custom_symbol_position: Type.Optional(Type.String({ description: '符号位置 left/right' })),
      }, { description: 'number 类型设置' }),
    ),
    member_setting: Type.Optional(
      Type.Object({
        multi: Type.Optional(Type.Boolean({ description: '是否支持多选' })),
      }, { description: 'member 类型设置' }),
    ),
    datetime_setting: Type.Optional(
      Type.Object({
        format: Type.Optional(Type.String({ description: '日期格式，如 yyyy/MM/dd' })),
      }, { description: 'datetime 类型设置' }),
    ),
    single_select_setting: Type.Optional(
      Type.Object({
        options: Type.Optional(
          Type.Array(
            Type.Object({
              name: Type.String({ description: '选项名称' }),
              color_index: Type.Optional(Type.Integer({ description: '颜色索引（0-24）' })),
            }),
          ),
        ),
      }, { description: 'single_select 类型设置' }),
    ),
    multi_select_setting: Type.Optional(
      Type.Object({
        options: Type.Optional(
          Type.Array(
            Type.Object({
              name: Type.String({ description: '选项名称' }),
              color_index: Type.Optional(Type.Integer({ description: '颜色索引（0-24）' })),
            }),
          ),
        ),
      }, { description: 'multi_select 类型设置' }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' }),
    ),
  }),

  // UPDATE
  Type.Object({
    action: Type.Literal('update'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID' }),
    update_fields: Type.Array(Type.String(), {
      description: '要更新的字段名列表，如 ["name", "number_setting"]',
    }),
    name: Type.Optional(Type.String({ description: '新名称' })),
    number_setting: Type.Optional(Type.Object({}, { additionalProperties: true, description: '数字类型设置' })),
    member_setting: Type.Optional(Type.Object({}, { additionalProperties: true, description: '成员类型设置' })),
    datetime_setting: Type.Optional(Type.Object({}, { additionalProperties: true, description: '日期类型设置' })),
    single_select_setting: Type.Optional(Type.Object({}, { additionalProperties: true, description: '单选类型设置' })),
    multi_select_setting: Type.Optional(Type.Object({}, { additionalProperties: true, description: '多选类型设置' })),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' }),
    ),
  }),

  // GET
  Type.Object({
    action: Type.Literal('get'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID' }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' }),
    ),
  }),

  // LIST
  Type.Object({
    action: Type.Literal('list'),
    resource_type: StringEnum(['tasklist'], { description: '资源类型，目前只支持 tasklist' }),
    resource_id: Type.String({ description: '资源 ID（清单 GUID）' }),
    page_size: Type.Optional(Type.Integer({ description: '分页大小（默认 50）', minimum: 1, maximum: 50 })),
    page_token: Type.Optional(Type.String({ description: '分页标记' })),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], { description: '用户 ID 类型（默认 open_id）' }),
    ),
  }),

  // ADD_TO_RESOURCE
  Type.Object({
    action: Type.Literal('add_to_resource'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID' }),
    resource_type: StringEnum(['tasklist'], { description: '资源类型，目前只支持 tasklist' }),
    resource_id: Type.String({ description: '资源 ID（清单 GUID）' }),
  }),

  // CREATE_OPTION（创建选项，用于 single_select / multi_select 字段）
  Type.Object({
    action: Type.Literal('create_option'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID（需为 single_select 或 multi_select 类型）' }),
    name: Type.String({ description: '选项名称' }),
    color_index: Type.Optional(Type.Integer({ description: '颜色索引（0-24）', minimum: 0, maximum: 24 })),
    insert_before: Type.Optional(Type.String({ description: '插入到此选项 GUID 之前（不填则追加到末尾）' })),
    insert_after: Type.Optional(Type.String({ description: '插入到此选项 GUID 之后（不填则追加到末尾）' })),
  }),

  // UPDATE_OPTION（更新选项）
  Type.Object({
    action: Type.Literal('update_option'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID' }),
    option_guid: Type.String({ description: '选项 GUID' }),
    name: Type.Optional(Type.String({ description: '新的选项名称' })),
    color_index: Type.Optional(Type.Integer({ description: '新的颜色索引（0-24）', minimum: 0, maximum: 24 })),
    is_hidden: Type.Optional(Type.Boolean({ description: '是否隐藏该选项' })),
    insert_before: Type.Optional(Type.String({ description: '移动到此选项 GUID 之前' })),
    insert_after: Type.Optional(Type.String({ description: '移动到此选项 GUID 之后' })),
  }),

  // REMOVE_FROM_RESOURCE
  Type.Object({
    action: Type.Literal('remove_from_resource'),
    custom_field_guid: Type.String({ description: '自定义字段 GUID' }),
    resource_type: StringEnum(['tasklist'], { description: '资源类型，目前只支持 tasklist' }),
    resource_id: Type.String({ description: '资源 ID（清单 GUID）' }),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuTaskCustomFieldParams =
  | {
      action: 'create';
      name: string;
      type: string;
      resource_type: string;
      resource_id: string;
      number_setting?: Record<string, any>;
      member_setting?: Record<string, any>;
      datetime_setting?: Record<string, any>;
      single_select_setting?: Record<string, any>;
      multi_select_setting?: Record<string, any>;
      user_id_type?: string;
    }
  | {
      action: 'update';
      custom_field_guid: string;
      update_fields: string[];
      name?: string;
      number_setting?: Record<string, any>;
      member_setting?: Record<string, any>;
      datetime_setting?: Record<string, any>;
      single_select_setting?: Record<string, any>;
      multi_select_setting?: Record<string, any>;
      user_id_type?: string;
    }
  | {
      action: 'get';
      custom_field_guid: string;
      user_id_type?: string;
    }
  | {
      action: 'list';
      resource_type: string;
      resource_id: string;
      page_size?: number;
      page_token?: string;
      user_id_type?: string;
    }
  | {
      action: 'add_to_resource';
      custom_field_guid: string;
      resource_type: string;
      resource_id: string;
    }
  | {
      action: 'remove_from_resource';
      custom_field_guid: string;
      resource_type: string;
      resource_id: string;
    }
  | {
      action: 'create_option';
      custom_field_guid: string;
      name: string;
      color_index?: number;
      insert_before?: string;
      insert_after?: string;
    }
  | {
      action: 'update_option';
      custom_field_guid: string;
      option_guid: string;
      name?: string;
      color_index?: number;
      is_hidden?: boolean;
      insert_before?: string;
      insert_after?: string;
    };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFeishuTaskCustomFieldTool(api: OpenClawPluginApi): void {
  if (!api.config) return;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_task_custom_field');

  registerTool(
    api,
    {
      name: 'feishu_task_custom_field',
      label: 'Feishu Task Custom Field',
      description:
        '飞书任务自定义字段管理工具。Actions: create（创建）, update（更新）, get（获取详情）, list（列取清单下的自定义字段）, add_to_resource（加入清单）, remove_from_resource（从清单移除）, create_option（创建选项，用于单/多选字段）, update_option（更新选项）。',
      parameters: FeishuTaskCustomFieldSchema,
      async execute(_toolCallId, params) {
        const p = params as FeishuTaskCustomFieldParams;

        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // CREATE
            // -----------------------------------------------------------------
            case 'create': {
              log.info(`create: name=${p.name}, type=${p.type}, resource_id=${p.resource_id}`);

              const body: any = {
                name: p.name,
                type: p.type,
                resource_type: p.resource_type,
                resource_id: p.resource_id,
              };
              if (p.number_setting) body.number_setting = p.number_setting;
              if (p.member_setting) body.member_setting = p.member_setting;
              if (p.datetime_setting) body.datetime_setting = p.datetime_setting;
              if (p.single_select_setting) body.single_select_setting = p.single_select_setting;
              if (p.multi_select_setting) body.multi_select_setting = p.multi_select_setting;

              const res = await client.invoke(
                'feishu_task_custom_field.create',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.create(
                    {
                      params: { user_id_type: p.user_id_type || 'open_id' },
                      data: body,
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`create: created custom field ${(res as any).data?.custom_field?.guid}`);
              return json({ custom_field: (res as any).data?.custom_field });
            }

            // -----------------------------------------------------------------
            // UPDATE
            // -----------------------------------------------------------------
            case 'update': {
              log.info(`update: custom_field_guid=${p.custom_field_guid}, update_fields=${p.update_fields.join(',')}`);

              const customFieldData: any = {};
              if (p.name !== undefined) customFieldData.name = p.name;
              if (p.number_setting !== undefined) customFieldData.number_setting = p.number_setting;
              if (p.member_setting !== undefined) customFieldData.member_setting = p.member_setting;
              if (p.datetime_setting !== undefined) customFieldData.datetime_setting = p.datetime_setting;
              if (p.single_select_setting !== undefined) customFieldData.single_select_setting = p.single_select_setting;
              if (p.multi_select_setting !== undefined) customFieldData.multi_select_setting = p.multi_select_setting;

              const res = await client.invoke(
                'feishu_task_custom_field.update',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.patch(
                    {
                      path: { custom_field_guid: p.custom_field_guid },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                      data: {
                        custom_field: customFieldData,
                        update_fields: p.update_fields,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`update: updated custom field ${p.custom_field_guid}`);
              return json({ custom_field: (res as any).data?.custom_field });
            }

            // -----------------------------------------------------------------
            // GET
            // -----------------------------------------------------------------
            case 'get': {
              log.info(`get: custom_field_guid=${p.custom_field_guid}`);

              const res = await client.invoke(
                'feishu_task_custom_field.get',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.get(
                    {
                      path: { custom_field_guid: p.custom_field_guid },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`get: retrieved custom field ${p.custom_field_guid}`);
              return json({ custom_field: (res as any).data?.custom_field });
            }

            // -----------------------------------------------------------------
            // LIST
            // -----------------------------------------------------------------
            case 'list': {
              log.info(`list: resource_type=${p.resource_type}, resource_id=${p.resource_id}`);

              const res = await client.invoke(
                'feishu_task_custom_field.list',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.list(
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
              log.info(`list: found ${data?.items?.length ?? 0} custom fields`);
              return json({
                items: data?.items,
                has_more: data?.has_more ?? false,
                page_token: data?.page_token,
              });
            }

            // -----------------------------------------------------------------
            // ADD_TO_RESOURCE
            // -----------------------------------------------------------------
            case 'add_to_resource': {
              log.info(`add_to_resource: custom_field_guid=${p.custom_field_guid}, resource_id=${p.resource_id}`);

              const res = await client.invoke(
                'feishu_task_custom_field.add_to_resource',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.add(
                    {
                      path: { custom_field_guid: p.custom_field_guid },
                      data: {
                        resource_type: p.resource_type,
                        resource_id: p.resource_id,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`add_to_resource: added custom field ${p.custom_field_guid} to resource ${p.resource_id}`);
              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // REMOVE_FROM_RESOURCE
            // -----------------------------------------------------------------
            case 'remove_from_resource': {
              log.info(`remove_from_resource: custom_field_guid=${p.custom_field_guid}, resource_id=${p.resource_id}`);

              const res = await client.invoke(
                'feishu_task_custom_field.remove_from_resource',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customField.remove(
                    {
                      path: { custom_field_guid: p.custom_field_guid },
                      data: {
                        resource_type: p.resource_type,
                        resource_id: p.resource_id,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`remove_from_resource: removed custom field ${p.custom_field_guid} from resource ${p.resource_id}`);
              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // CREATE_OPTION
            // -----------------------------------------------------------------
            case 'create_option': {
              log.info(`create_option: custom_field_guid=${p.custom_field_guid}, name=${p.name}`);

              const body: any = { name: p.name };
              if (p.color_index !== undefined) body.color_index = p.color_index;
              if (p.insert_before) body.insert_before = p.insert_before;
              if (p.insert_after) body.insert_after = p.insert_after;

              const res = await client.invoke(
                'feishu_task_custom_field.create_option',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customFieldOption.create(
                    {
                      path: { custom_field_guid: p.custom_field_guid },
                      data: body,
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`create_option: created option for field ${p.custom_field_guid}`);
              return json({ option: (res as any).data?.option });
            }

            // -----------------------------------------------------------------
            // UPDATE_OPTION
            // -----------------------------------------------------------------
            case 'update_option': {
              log.info(`update_option: custom_field_guid=${p.custom_field_guid}, option_guid=${p.option_guid}`);

              const body: any = {};
              if (p.name !== undefined) body.name = p.name;
              if (p.color_index !== undefined) body.color_index = p.color_index;
              if (p.is_hidden !== undefined) body.is_hidden = p.is_hidden;
              if (p.insert_before) body.insert_before = p.insert_before;
              if (p.insert_after) body.insert_after = p.insert_after;

              const res = await client.invoke(
                'feishu_task_custom_field.update_option',
                (sdk: any, opts: any) =>
                  sdk.task.v2.customFieldOption.patch(
                    {
                      path: { custom_field_guid: p.custom_field_guid, option_guid: p.option_guid },
                      data: { option: body },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`update_option: updated option ${p.option_guid}`);
              return json({ option: (res as any).data?.option });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_task_custom_field' },
  );
}
