/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_task_attachment tool -- 任务附件管理
 *
 * Actions:
 *   - list:   列取任务附件
 *   - get:    获取附件详情（含临时下载链接）
 *   - delete: 删除附件
 *
 * Uses the Feishu Task v2 API:
 *   - list:   GET    /open-apis/task/v2/attachments
 *   - get:    GET    /open-apis/task/v2/attachments/:attachment_guid
 *   - delete: DELETE /open-apis/task/v2/attachments/:attachment_guid
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import { json, createToolContext, assertLarkOk, handleInvokeErrorWithAutoAuth, registerTool, StringEnum } from '../helpers';
import type { PaginatedData } from '../sdk-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuTaskAttachmentSchema = Type.Union([
  // LIST
  Type.Object({
    action: Type.Literal('list'),
    resource_type: StringEnum(['task'], {
      description: '附件归属的资源类型，目前只支持 task',
    }),
    resource_id: Type.String({
      description: '附件归属的资源 ID（任务 GUID）',
    }),
    page_size: Type.Optional(
      Type.Integer({
        description: '分页大小（默认 50，最大 50）',
        minimum: 1,
        maximum: 50,
      }),
    ),
    page_token: Type.Optional(
      Type.String({
        description: '分页标记，首次请求无需填写',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // GET
  Type.Object({
    action: Type.Literal('get'),
    attachment_guid: Type.String({
      description: '附件 GUID',
    }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // DELETE
  Type.Object({
    action: Type.Literal('delete'),
    attachment_guid: Type.String({
      description: '要删除的附件 GUID',
    }),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuTaskAttachmentParams =
  | {
      action: 'list';
      resource_type: 'task';
      resource_id: string;
      page_size?: number;
      page_token?: string;
      user_id_type?: string;
    }
  | {
      action: 'get';
      attachment_guid: string;
      user_id_type?: string;
    }
  | {
      action: 'delete';
      attachment_guid: string;
    };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFeishuTaskAttachmentTool(api: OpenClawPluginApi): void {
  if (!api.config) return;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_task_attachment');

  registerTool(
    api,
    {
      name: 'feishu_task_attachment',
      label: 'Feishu Task Attachment',
      description:
        '飞书任务附件管理工具。Actions: list（列取任务附件）, get（获取附件详情及临时下载链接）, delete（删除附件）。',
      parameters: FeishuTaskAttachmentSchema,
      async execute(_toolCallId, params) {
        const p = params as FeishuTaskAttachmentParams;

        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // LIST
            // -----------------------------------------------------------------
            case 'list': {
              log.info(`list: resource_type=${p.resource_type}, resource_id=${p.resource_id}`);

              const res = await client.invoke(
                'feishu_task_attachment.list',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sdk: any, opts: any) =>
                  sdk.task.v2.attachment.list(
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
              log.info(`list: found ${data?.items?.length ?? 0} attachments`);

              return json({
                items: data?.items,
                has_more: data?.has_more ?? false,
                page_token: data?.page_token,
              });
            }

            // -----------------------------------------------------------------
            // GET
            // -----------------------------------------------------------------
            case 'get': {
              log.info(`get: attachment_guid=${p.attachment_guid}`);

              const res = await client.invoke(
                'feishu_task_attachment.get',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sdk: any, opts: any) =>
                  sdk.task.v2.attachment.get(
                    {
                      path: { attachment_guid: p.attachment_guid },
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`get: retrieved attachment ${p.attachment_guid}`);

              return json({ attachment: (res as any).data?.attachment });
            }

            // -----------------------------------------------------------------
            // DELETE
            // -----------------------------------------------------------------
            case 'delete': {
              log.info(`delete: attachment_guid=${p.attachment_guid}`);

              const res = await client.invoke(
                'feishu_task_attachment.delete',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sdk: any, opts: any) =>
                  sdk.task.v2.attachment.delete(
                    {
                      path: { attachment_guid: p.attachment_guid },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              log.info(`delete: deleted attachment ${p.attachment_guid}`);

              return json({ success: true });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_task_attachment' },
  );
}
