import { env } from 'hono/adapter';
import type { Context } from 'hono';

/**
 * 跨运行时读环境变量。
 *
 * hono/adapter 的 env() 只在 Cloudflare Workers（workerd）下返回绑定
 * （c.env）；在 EdgeOne 上 getRuntimeKey() 是 "other"，env() 直接返回 {}，
 * 所以控制台配的环境变量读不到。EdgeOne / Cloudflare 的绑定都在 c.env 里，
 * 因此优先读 c.env，再回退到 env()（本地 Node 走 process.env）。
 * 两边都有时以 c.env 为准。
 */
export function getEnv<T extends Record<string, string>>(c: Context): T {
    const bindings = (c.env || {}) as Record<string, string>;
    const adapterEnv = (env<Record<string, string>>(c) || {}) as Record<string, string>;
    return { ...adapterEnv, ...bindings } as T;
}
