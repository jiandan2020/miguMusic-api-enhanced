import { env } from 'hono/adapter';
import type { Context, Next } from 'hono';

/**
 * API 鉴权中间件
 *
 * - 密钥来自环境变量 API_KEY；未配置时不鉴权（保持公开访问，避免未配好就把自己锁在外面）。
 * - 客户端二选一：请求头 `Authorization: Bearer <key>`，或查询参数 `?key=<key>`。
 * - 以下公开路径不鉴权：/migu（重定向到文档）、/migu/status、/migu/version。
 * - 必须放在缓存中间件之前，否则缓存可能把已鉴权的响应直接返回给未带 Key 的请求。
 *
 * 注意：不要用 hono/adapter 的 env() 读 API_KEY。env() 只在 Cloudflare
 * Workers（workerd）下返回绑定（c.env），在 EdgeOne 上运行时 getRuntimeKey()
 * 是 "other"，env() 直接返回 {}。EdgeOne 控制台配的环境变量在 c.env 里，
 * 所以这里优先读 c.env，再回退到 env()（本地 Node 用 process.env）。
 */
const PUBLIC_PATHS = new Set(['/migu', '/migu/status', '/migu/version']);

function getApiKey(c: Context): string {
    const fromBindings = (c.env as Record<string, string> | undefined)?.API_KEY || '';
    if (fromBindings) {
        return fromBindings;
    }
    return env<{ API_KEY: string }>(c).API_KEY || '';
}

export async function apiAuth(c: Context, next: Next) {
    const apiKey = getApiKey(c);
    if (!apiKey) {
        return next();
    }

    if (PUBLIC_PATHS.has(c.req.path)) {
        return next();
    }

    const authHeader = c.req.header('Authorization') || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const key = bearer || c.req.query('key') || '';

    if (key !== apiKey) {
        return c.json(
            { success: false, error: 'Unauthorized', message: '缺少或错误的 API Key' },
            401
        );
    }

    return next();
}
