/**
 * Copyright (c) 2026 ByteDance Ltd. and/or its affiliates
 * SPDX-License-Identifier: MIT
 *
 * Local shim for symbols removed from openclaw/plugin-sdk in 2026.3.14.
 * Provides jsonResult and readReactionParams with correct typing.
 */

/**
 * Wrap an object as an AgentToolResult-compatible text result.
 * Uses `'text' as const` to satisfy the stricter literal type requirement.
 */
export function jsonResult(obj: unknown): { type: 'text'; text: string } {
  return { type: 'text' as const, text: JSON.stringify(obj) };
}

/**
 * Extract reaction parameters from raw action params.
 * Returns emoji, remove flag, and isEmpty indicator.
 */
export function readReactionParams(
  params: Record<string, unknown>,
  opts?: { removeErrorMessage?: string },
): { emoji: string; remove: boolean; isEmpty: boolean } {
  const raw = params.emoji ?? params.reaction ?? params.type;
  const emoji = typeof raw === 'string' ? raw.trim() : '';
  const remove = Boolean(params.remove ?? params.unreact);
  const isEmpty = !emoji && !remove;

  if (remove && !emoji && opts?.removeErrorMessage) {
    throw new Error(opts.removeErrorMessage);
  }

  return { emoji, remove, isEmpty };
}
