/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * feishu_chat tool -- 管理飞书群聊
 *
 * Actions:
 *   - search:  搜索对用户或机器人可见的群列表
 *   - get:     获取指定群的详细信息
 *   - list:    获取用户或机器人所在的群列表
 *   - create:  创建群
 *   - update:  更新群信息
 *   - disband: 解散群
 *
 * Uses the Feishu IM v1 API:
 *   - search:  GET    /open-apis/im/v1/chats/search
 *   - get:     GET    /open-apis/im/v1/chats/:chat_id
 *   - list:    GET    /open-apis/im/v1/chats
 *   - create:  POST   /open-apis/im/v1/chats
 *   - update:  PUT    /open-apis/im/v1/chats/:chat_id
 *   - disband: DELETE /open-apis/im/v1/chats/:chat_id
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { Type } from '@sinclair/typebox';
import { json, createToolContext, assertLarkOk, handleInvokeErrorWithAutoAuth, registerTool, StringEnum } from '../helpers';
import type { PaginatedData } from '../sdk-types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const FeishuChatSchema = Type.Union([
  // SEARCH
  Type.Object({
    action: Type.Literal('search'),
    query: Type.String({
      description: '搜索关键词（必填）。支持匹配群名称、群成员名称。' + '支持多语种、拼音、前缀等模糊搜索。',
    }),
    page_size: Type.Optional(
      Type.Integer({
        description: '分页大小（默认20）',
        minimum: 1,
      }),
    ),
    page_token: Type.Optional(
      Type.String({
        description: '分页标记。首次请求无需填写',
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
    chat_id: Type.String({
      description: '群 ID（格式如 oc_xxx）',
    }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // LIST
  Type.Object({
    action: Type.Literal('list'),
    page_size: Type.Optional(
      Type.Integer({
        description: '分页大小（默认20，最大100）',
        minimum: 1,
        maximum: 100,
      }),
    ),
    page_token: Type.Optional(
      Type.String({
        description: '分页标记。首次请求无需填写',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // CREATE
  Type.Object({
    action: Type.Literal('create'),
    name: Type.Optional(
      Type.String({
        description: '群名称。创建内部群时必填（P2P 除外）',
      }),
    ),
    description: Type.Optional(
      Type.String({
        description: '群描述',
      }),
    ),
    user_id_list: Type.Optional(
      Type.Array(Type.String(), {
        description: '拉入群的用户 ID 列表（类型由 user_id_type 决定）',
      }),
    ),
    owner_id: Type.Optional(
      Type.String({
        description: '群主 ID（类型由 user_id_type 决定）',
      }),
    ),
    chat_mode: Type.Optional(
      StringEnum(['group', 'topic'], {
        description: '群模式。group=群组（默认），topic=话题群',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // UPDATE
  Type.Object({
    action: Type.Literal('update'),
    chat_id: Type.String({
      description: '群 ID（格式如 oc_xxx）',
    }),
    name: Type.Optional(
      Type.String({
        description: '新的群名称',
      }),
    ),
    description: Type.Optional(
      Type.String({
        description: '新的群描述',
      }),
    ),
    owner_id: Type.Optional(
      Type.String({
        description: '新的群主 ID（类型由 user_id_type 决定）',
      }),
    ),
    add_member_permission: Type.Optional(
      StringEnum(['all_members', 'only_owner'], {
        description: '添加成员权限。all_members=所有成员可添加，only_owner=仅群主和管理员可添加',
      }),
    ),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // DISBAND
  Type.Object({
    action: Type.Literal('disband'),
    chat_id: Type.String({
      description: '要解散的群 ID（格式如 oc_xxx）。注意：操作不可逆，解散后群内所有数据将无法恢复。',
    }),
  }),

  // GET_ANNOUNCEMENT
  Type.Object({
    action: Type.Literal('get_announcement'),
    chat_id: Type.String({
      description: '群 ID（格式如 oc_xxx）。注意：不支持单聊。',
    }),
    user_id_type: Type.Optional(
      StringEnum(['open_id', 'union_id', 'user_id'], {
        description: '用户 ID 类型（默认 open_id）',
      }),
    ),
  }),

  // IS_MEMBER（判断用户是否在群里）
  Type.Object({
    action: Type.Literal('is_member'),
    chat_id: Type.String({ description: '群 ID（格式如 oc_xxx）' }),
    member_id: Type.String({ description: '要查询的用户 open_id 或机器人 app_id' }),
    member_id_type: Type.Optional(
      StringEnum(['user_id', 'open_id', 'union_id', 'app_id'], {
        description: '成员 ID 类型（默认 open_id）',
      }),
    ),
  }),
]);

// ---------------------------------------------------------------------------
// Params type
// ---------------------------------------------------------------------------

type FeishuChatParams =
  | {
      action: 'search';
      query: string;
      page_size?: number;
      page_token?: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'get';
      chat_id: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'list';
      page_size?: number;
      page_token?: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'create';
      name?: string;
      description?: string;
      user_id_list?: string[];
      owner_id?: string;
      chat_mode?: 'group' | 'topic';
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'update';
      chat_id: string;
      name?: string;
      description?: string;
      owner_id?: string;
      add_member_permission?: 'all_members' | 'only_owner';
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'disband';
      chat_id: string;
    }
  | {
      action: 'get_announcement';
      chat_id: string;
      user_id_type?: 'open_id' | 'union_id' | 'user_id';
    }
  | {
      action: 'is_member';
      chat_id: string;
      member_id: string;
      member_id_type?: 'user_id' | 'open_id' | 'union_id' | 'app_id';
    };

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerChatSearchTool(api: OpenClawPluginApi): boolean {
  if (!api.config) return false;
  const cfg = api.config;

  const { toolClient, log } = createToolContext(api, 'feishu_chat');

  return registerTool(
    api,
    {
      name: 'feishu_chat',
      label: 'Feishu: Chat Management',
      description:
        '以用户身份调用飞书群聊管理工具。Actions: search（搜索群列表）, get（获取群详情）, list（获取所在群列表）, create（创建群）, update（更新群信息）, disband（解散群，不可逆）, is_member（判断用户是否在群里）。',
      parameters: FeishuChatSchema,
      async execute(_toolCallId: string, params: unknown) {
        const p = params as FeishuChatParams;
        try {
          const client = toolClient();

          switch (p.action) {
            // -----------------------------------------------------------------
            // SEARCH
            // -----------------------------------------------------------------
            case 'search': {
              log.info(`search: query="${p.query}", page_size=${p.page_size ?? 20}`);

              const res = await client.invoke(
                'feishu_chat.search',
                (sdk, opts) =>
                  sdk.im.v1.chat.search(
                    {
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                        query: p.query,
                        page_size: p.page_size,
                        page_token: p.page_token,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              const data = res.data as PaginatedData | undefined;
              const chatCount = data?.items?.length ?? 0;
              log.info(`search: found ${chatCount} chats`);

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
              log.info(`get: chat_id=${p.chat_id}`);

              const res = await client.invoke(
                'feishu_chat.get',
                (sdk, opts) =>
                  sdk.im.v1.chat.get(
                    {
                      path: {
                        chat_id: p.chat_id,
                      },
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                      },
                    },
                    {
                      ...(opts ?? {}),
                      headers: {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ...((opts as any)?.headers ?? {}),
                        'X-Chat-Custom-Header': 'enable_chat_list_security_check',
                      },
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`get: retrieved chat info for ${p.chat_id}`);

              return json({
                chat: res.data,
              });
            }

            // -----------------------------------------------------------------
            // LIST
            // -----------------------------------------------------------------
            case 'list': {
              log.info(`list: page_size=${p.page_size ?? 20}`);

              const res = await client.invoke(
                'feishu_chat.list',
                (sdk, opts) =>
                  sdk.im.v1.chat.list(
                    {
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                        page_size: p.page_size,
                        page_token: p.page_token,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              const data = res.data as PaginatedData | undefined;
              log.info(`list: found ${data?.items?.length ?? 0} chats`);

              return json({
                items: data?.items,
                has_more: data?.has_more ?? false,
                page_token: data?.page_token,
              });
            }

            // -----------------------------------------------------------------
            // CREATE
            // -----------------------------------------------------------------
            case 'create': {
              log.info(`create: name=${p.name}`);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const body: any = {};
              if (p.name) body.name = p.name;
              if (p.description) body.description = p.description;
              if (p.owner_id) body.owner_id = p.owner_id;
              if (p.user_id_list) body.user_id_list = p.user_id_list;
              if (p.chat_mode) body.chat_mode = p.chat_mode;

              const res = await client.invoke(
                'feishu_chat.create',
                (sdk, opts) =>
                  sdk.im.v1.chat.create(
                    {
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                      },
                      data: body,
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`create: created chat ${res.data?.chat_id}`);

              return json({
                chat_id: res.data?.chat_id,
                name: res.data?.name,
              });
            }

            // -----------------------------------------------------------------
            // UPDATE
            // -----------------------------------------------------------------
            case 'update': {
              log.info(`update: chat_id=${p.chat_id}`);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const body: any = {};
              if (p.name !== undefined) body.name = p.name;
              if (p.description !== undefined) body.description = p.description;
              if (p.owner_id !== undefined) body.owner_id = p.owner_id;
              if (p.add_member_permission !== undefined) body.add_member_permission = p.add_member_permission;

              const res = await client.invoke(
                'feishu_chat.update',
                (sdk, opts) =>
                  sdk.im.v1.chat.update(
                    {
                      path: { chat_id: p.chat_id },
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                      },
                      data: body,
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`update: chat ${p.chat_id} updated`);

              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // DISBAND
            // -----------------------------------------------------------------
            case 'disband': {
              log.info(`disband: chat_id=${p.chat_id}`);

              const res = await client.invoke(
                'feishu_chat.disband',
                (sdk, opts) =>
                  sdk.im.v1.chat.delete(
                    {
                      path: { chat_id: p.chat_id },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`disband: chat ${p.chat_id} disbanded`);

              return json({ success: true });
            }

            // -----------------------------------------------------------------
            // GET_ANNOUNCEMENT
            // -----------------------------------------------------------------
            case 'get_announcement': {
              log.info(`get_announcement: chat_id=${p.chat_id}`);

              const res = await client.invoke(
                'feishu_chat.get_announcement',
                (sdk, opts) =>
                  sdk.im.v1.chatAnnouncement.get(
                    {
                      path: { chat_id: p.chat_id },
                      params: {
                        user_id_type: p.user_id_type || 'open_id',
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res);

              log.info(`get_announcement: retrieved announcement for chat ${p.chat_id}`);

              return json({ announcement: res.data });
            }

            // -----------------------------------------------------------------
            // IS_MEMBER（判断用户是否在群里）
            // -----------------------------------------------------------------
            case 'is_member': {
              log.info(`is_member: chat_id=${p.chat_id}, member_id=${p.member_id}`);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const res = await client.invoke(
                'feishu_chat.is_member',
                (sdk: any, opts: any) =>
                  sdk.im.v1.chatMembers.isInChat(
                    {
                      path: { chat_id: p.chat_id },
                      params: {
                        member_id_type: p.member_id_type || 'open_id',
                        member_id: p.member_id,
                      },
                    },
                    opts,
                  ),
                { as: 'user' },
              );
              assertLarkOk(res as any);

              const isInChat = (res as any).data?.is_in_chat;
              log.info(`is_member: member_id=${p.member_id} is_in_chat=${isInChat}`);
              return json({ is_in_chat: isInChat });
            }
          }
        } catch (err) {
          return await handleInvokeErrorWithAutoAuth(err, cfg);
        }
      },
    },
    { name: 'feishu_chat' },
  );
}
