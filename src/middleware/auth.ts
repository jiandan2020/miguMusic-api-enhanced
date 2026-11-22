import { getEnv } from '../utils/env';
import type { Context, Next } from 'hono';

/**
 * API 鉴权中间件
 *
 * - 密钥来自环境变量 API_KEY；未配置时不鉴权（保持公开访问，避免未配好就把自己锁在外面）。
 * - 客户端二选一：请求头 `Authorization: Bearer <key>`，或查询参数 `?key=<key>`。
 * - 以下公开路径不鉴权：/migu（重定向到文档）、/migu/status、/migu/version、
 *   /miguadmin（管理页面本身；里面的数据请求仍要带 Key 校验后才能看到内容）。
 * - 必须放在缓存中间件之前，否则缓存可能把已鉴权的响应直接返回给未带 Key 的请求。
 *
 * 环境变量用 getEnv() 读（见 src/utils/env.ts）：hono/adapter 的 env()
 * 只在 Cloudflare Workers（workerd）下返回绑定，在 EdgeOne 上直接返回 {}。
 */
const PUBLIC_PATHS = new Set(['/migu', '/migu/status', '/migu/version', '/miguadmin', '/miguadmin/']);

function getApiKey(c: Context): string {
    return getEnv<{ API_KEY: string }>(c).API_KEY || '';
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
