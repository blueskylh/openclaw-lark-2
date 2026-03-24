/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 */

import type { OpenClawPluginApi } from 'openclaw/plugin-sdk';
import { registerFeishuOkrTool } from './okr';

export function registerFeishuOkrTools(api: OpenClawPluginApi) {
  if (!api.config) return;
  registerFeishuOkrTool(api);
  api.logger.info?.('feishu_okr: Registered feishu_okr');
}
