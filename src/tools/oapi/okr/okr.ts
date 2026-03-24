/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_okr tool -- OKR 管理
 *
 * Actions:
 *   - list_periods:    获取 OKR 周期列表
 *   - list:            获取用户的 OKR 列表
 *   - get:             批量获取 OKR
 *   - add_progress:    创建 OKR 进展记录
 *   - update_progress: 更新 OKR 进展记录
 *   - get_progress:    获取 OKR 进展记录
 *   - delete_progress: 删除 OKR 进展记录
 *
 * Uses the Feishu OKR v1 API:
 *   - list_periods:    GET    /open-apis/okr/v1/periods
 *   - list:            GET    /open-apis/okr/v1/users/:user_id/okrs
 *   - get:             GET    /open-apis/okr/v1/okrs/batch_get
 *   - add_progress:    POST   /open-apis/okr/v1/progress_records
 *   - update_progress: PUT    /open-apis/okr/v1/progress_records/:progress_id
 *   - get_progress:    GET    /open-apis/okr/v1/progress_records/:progress_id
 *   - delete_progress: DELETE /open-apis/okr/v1/progress_records/:progress_id
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import {
  json,
  createToolContext,
  assertLarkOk,
  handleInvokeErrorWithAutoAuth,
  registerTool,
  StringEnum,
} from '../helpers';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuOkrSchema = Type.Union([
  // LIST_PERIODS
  Type.Object({
    action: Type.Literal('list_periods'),
    page_token: Type.Optional(Type.String({ description: '分页标记' })),
    page_size: Type.Optional(Type.Integer({ description: '分页大小（默认 10）', minimum: 1 })),
  }),

  // LIST (用户 OKR 列表)
  Type.Object({
    action: Type.Literal('list'),
    user_id: Type.Optional(Type.String({
      description: '目标用户 ID（不填则查询自己，需要传 me 或实际 open_id）',
    })),
    offset: Type.Optional(Type.Integer({ description: '列表偏移（默认 0）', minimum: 0 })),
    limit: Type.Optional(Type.Integer({ description: '返回数量（0-10，默认 5）', minimum: 1, maximum: 10 })),
    period_ids: Type.Optional(Type.Array(Type.String(), {
      description: '按周期 ID 过滤（最多 10 个，可通过 list_periods 获取）',
    })),
    lang: Type.Optional(StringEnum(['zh_cn', 'en_us'], { description: '语言（默认 zh_cn）' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], {
      description: '用户 ID 类型（默认 open_id）',
    })),
  }),

  // GET (批量获取 OKR)
  Type.Object({
    action: Type.Literal('get'),
    okr_ids: Type.Array(Type.String(), {
      description: 'OKR ID 列表（最多 10 个，可通过 list action 获取）',
    }),
    lang: Type.Optional(StringEnum(['zh_cn', 'en_us'], { description: '语言（默认 zh_cn）' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], {
      description: '用户 ID 类型（默认 open_id）',
    })),
  }),

  // ADD_PROGRESS
  Type.Object({
    action: Type.Literal('add_progress'),
    target_id: Type.String({
      description: '目标 ID（O 的 ID 或 KR 的 ID，可通过 list/get action 获取）',
    }),
    target_type: Type.Union([Type.Literal(2), Type.Literal(3)], {
      description: '目标类型：2=O（Objective），3=KR（Key Result）',
    }),
    content_text: Type.String({
      description: '进展内容纯文本（AI 自动生成填写）',
    }),
    source_title: Type.Optional(Type.String({ description: '进展来源名称（默认：OpenClaw AI）' })),
    source_url: Type.Optional(Type.String({ description: '进展来源链接（默认：https://openclaw.ai）' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], {
      description: '用户 ID 类型（默认 open_id）',
    })),
  }),

  // UPDATE_PROGRESS
  Type.Object({
    action: Type.Literal('update_progress'),
    progress_id: Type.String({ description: '进展记录 ID' }),
    content_text: Type.String({ description: '更新后的进展内容纯文本' }),
    source_title: Type.Optional(Type.String({ description: '进展来源名称' })),
    source_url: Type.Optional(Type.String({ description: '进展来源链接' })),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], {
      description: '用户 ID 类型（默认 open_id）',
    })),
  }),

  // GET_PROGRESS
  Type.Object({
    action: Type.Literal('get_progress'),
    progress_id: Type.String({ description: '进展记录 ID' }),
    user_id_type: Type.Optional(StringEnum(['open_id', 'union_id', 'user_id'], {
      description: '用户 ID 类型（默认 open_id）',
    })),
  }),

  // DELETE_PROGRESS
  Type.Object({
    action: Type.Literal('delete_progress'),
    progress_id: Type.String({ description: '进展记录 ID' }),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuOkrParams =
  | { action: 'list_periods'; page_token?: string; page_size?: number }
  | {
      action: 'list';
      user_id?: string;
      offset?: number;
      limit?: number;
      period_ids?: string[];
      lang?: string;
      user_id_type?: string;
    }
  | { action: 'get'; okr_ids: string[]; lang?: string; user_id_type?: string }
  | {
      action: 'add_progress';
      target_id: string;
      target_type: 2 | 3;
      content_text: string;
      source_title?: string;
      source_url?: string;
      user_id_type?: string;
    }
  | {
      action: 'update_progress';
      progress_id: string;
      content_text: string;
      source_title?: string;
      source_url?: string;
      user_id_type?: string;
    }
  | { action: 'get_progress'; progress_id: string; user_id_type?: string }
  | { action: 'delete_progress'; progress_id: string };

// ---------------------------------------------------------------------------
// Helper: 将纯文本构建成飞书 OKR 富文本格式
// ---------------------------------------------------------------------------

function buildContentBlock(text: string): object {
  return {
    blocks: [
      {
        type: 'paragraph',
        paragraph: {
          elements: [
            {
              type: 'textRun',
              textRun: { text },
            },
          ],
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFeishuOkrTool(api: OpenClawPluginApi): void {
  if (!api.config) return;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_okr');

  registerTool(
    api,
    {
      name: 'feishu_okr',
      label: 'Feishu OKR',
      description:
        '飞书 OKR 管理工具。Actions: list_periods（获取周期列表）, list（获取我的 OKR 列表）, get（批量获取 OKR 详情）, add_progress（添加进展记录）, update_progress（更新进展）, get_progress（获取进展详情）, delete_progress（删除进展）。',
      parameters: FeishuOkrSchema,
      async execute(_toolCallId, params) {
        const p = params as FeishuOkrParams;
        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // LIST_PERIODS
            // -----------------------------------------------------------------
            case 'list_periods': {
              log.info(`list_periods: page_size=${p.page_size ?? 10}`);
              const res = await client.invoke(
                'feishu_okr.list_periods',
                (sdk: any, opts: any) =>
                  sdk.okr.period.list(
                    { params: { page_token: p.page_token, page_size: p.page_size } },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              const data = (res as any).data;
              log.info(`list_periods: found ${data?.items?.length ?? 0} periods`);
              return json({ items: data?.items, has_more: data?.has_more ?? false, page_token: data?.page_token });
            }

            // -----------------------------------------------------------------
            // LIST
            // -----------------------------------------------------------------
            case 'list': {
              const userId = p.user_id || 'me';
              log.info(`list: user_id=${userId}, offset=${p.offset ?? 0}, limit=${p.limit ?? 5}`);
              const res = await client.invoke(
                'feishu_okr.list',
                (sdk: any, opts: any) =>
                  sdk.okr.userOkr.list(
                    {
                      path: { user_id: userId },
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                        offset: String(p.offset ?? 0),
                        limit: String(p.limit ?? 5),
                        lang: p.lang || 'zh_cn',
                        period_ids: p.period_ids,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              const data = (res as any).data;
              log.info(`list: found ${data?.okr_list?.length ?? 0} OKRs`);
              return json({ okr_list: data?.okr_list, total: data?.total });
            }

            // -----------------------------------------------------------------
            // GET
            // -----------------------------------------------------------------
            case 'get': {
              log.info(`get: okr_ids=${p.okr_ids.join(',')}`);
              const res = await client.invoke(
                'feishu_okr.get',
                (sdk: any, opts: any) =>
                  sdk.okr.okr.batchGet(
                    {
                      params: {
                        okr_ids: p.okr_ids,
                        user_id_type: p.user_id_type || 'open_id',
                        lang: p.lang || 'zh_cn',
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              const data = (res as any).data;
              log.info(`get: retrieved ${data?.okr_list?.length ?? 0} OKRs`);
              return json({ okr_list: data?.okr_list });
            }

            // -----------------------------------------------------------------
            // ADD_PROGRESS
            // -----------------------------------------------------------------
            case 'add_progress': {
              log.info(`add_progress: target_id=${p.target_id}, target_type=${p.target_type}`);
              const res = await client.invoke(
                'feishu_okr.add_progress',
                (sdk: any, opts: any) =>
                  sdk.okr.progressRecord.create(
                    {
                      params: { user_id_type: p.user_id_type || 'open_id' },
                      data: {
                        source_title: p.source_title || 'OpenClaw AI',
                        source_url: p.source_url || 'https://openclaw.ai',
                        target_id: p.target_id,
                        target_type: p.target_type,
                        content: buildContentBlock(p.content_text),
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              const record = (res as any).data?.progress_record;
              log.info(`add_progress: created progress_id=${record?.id}`);
              return json({ progress_record: record });
            }

            // -----------------------------------------------------------------
            // UPDATE_PROGRESS
            // -----------------------------------------------------------------
            case 'update_progress': {
              log.info(`update_progress: progress_id=${p.progress_id}`);
              const res = await client.invoke(
                'feishu_okr.update_progress',
                (sdk: any, opts: any) =>
                  sdk.okr.progressRecord.update(
                    {
                      path: { progress_id: p.progress_id },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                      data: {
                        source_title: p.source_title || 'OpenClaw AI',
                        source_url: p.source_url || 'https://openclaw.ai',
                        content: buildContentBlock(p.content_text),
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              const record = (res as any).data?.progress_record;
              log.info(`update_progress: updated progress_id=${p.progress_id}`);
              return json({ progress_record: record });
            }

            // -----------------------------------------------------------------
            // GET_PROGRESS
            // -----------------------------------------------------------------
            case 'get_progress': {
              log.info(`get_progress: progress_id=${p.progress_id}`);
              const res = await client.invoke(
                'feishu_okr.get_progress',
                (sdk: any, opts: any) =>
                  sdk.okr.progressRecord.get(
                    {
                      path: { progress_id: p.progress_id },
                      params: { user_id_type: p.user_id_type || 'open_id' },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              log.info(`get_progress: retrieved progress_id=${p.progress_id}`);
              return json({ progress_record: (res as any).data?.progress_record });
            }

            // -----------------------------------------------------------------
            // DELETE_PROGRESS
            // -----------------------------------------------------------------
            case 'delete_progress': {
              log.info(`delete_progress: progress_id=${p.progress_id}`);
              const res = await client.invoke(
                'feishu_okr.delete_progress',
                (sdk: any, opts: any) =>
                  sdk.okr.progressRecord.delete(
                    { path: { progress_id: p.progress_id } },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);
              log.info(`delete_progress: deleted progress_id=${p.progress_id}`);
              return json({ success: true });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_okr' },
  );
}
