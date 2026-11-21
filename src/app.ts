import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { memCache } from 'hono-mem-cache';
import { getRuntimeKey } from 'hono/adapter';
import { getEnv } from './utils/env';
import { methodNotAllowed } from 'hono/method-not-allowed';
import { apiAuth } from './middleware/auth';
import apiRoutes from './routers/index';

// 通过 import 引入 package.json，esbuild / tsup 在构建时会将 JSON 内联到产物中
// 这样在 Node、Cloudflare Workers、Vercel Edge、Deno、EdgeOne 等所有 bundler 平台都能直接读取版本号
// 需要 tsconfig 启用 "resolveJsonModule": true
import pkg from '../package.json' with { type: "json" };

const CACHE_SECONDS = 300; // 5分钟缓存

const app = new Hono();

// 全局中间件
app.use('*', logger());

/**
 * CORS 配置
 * 支持从环境变量读取允许的源列表
 * 当未配置 ALLOWED_ORIGINS 时，允许所有跨域请求（*）
 */
app.use(
    '*',
    cors({
        origin: (origin: string, c) => {
            const { ALLOWED_ORIGINS } = getEnv<{ ALLOWED_ORIGINS: string }>(c);
            if (!ALLOWED_ORIGINS) {
                return origin; // 当未配置 ALLOWED_ORIGINS 时，允许所有跨域请求（*）
            }
            const origins = ALLOWED_ORIGINS.split(',');
            if (origins[0] === '*') {
                // 当配置为 '*' 时，允许所有跨域请求
                return origin;
            }
            if (origins.length === 0) {
                // 当配置 ALLOWED_ORIGINS=空 时，拒绝所有跨域请求（安全策略）
                return null;
            }
            // 当请求源不在允许列表中时，返回 null 表示拒绝
            return origins.includes(origin) ? origin : null;
        },
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['Content-Length', 'X-Kuma-Revision'],
        maxAge: 600,
        credentials: true,
    })
);

// ETag 中间件已移除（EdgeOne 专用）：Hono 的 etag 在计算摘要时读取响应体
// 数据流，假设每个数据块都是 Uint8Array 并调用 .subarray()；而 EdgeOne
// 的流给出的是 ArrayBuffer（有 byteLength、没有 subarray），导致每个
// GET 请求都在这里以 "chunk.subarray is not a function" 崩掉。ETag 只是
// 缓存优化（304），去掉不影响接口本身。
// cache control
app.use('*', (c, next) => {
    c.header('Cache-Control', `private, no-cache`); //必走304
    return next();
});
// method
app.use(
    methodNotAllowed({app, onMethodNotAllowed:(c, methods) =>
        c.json({ error: 'Method Not Allowed' }, 405, {
            Allow: methods.join(', '),
        })
    })
)

/**
 * API 鉴权中间件
 * 必须放在缓存中间件之前（见 src/middleware/auth.ts 的说明）。
 * 注意：CORS 中间件在它前面，所以浏览器跨域预检（OPTIONS）不受鉴权影响。
 */
app.use('*', apiAuth);

/**
 * 配置内存缓存中间件
 * max: 最大缓存项数
 * ttl: 缓存过期时间（毫秒）
 */
app.use(
    '*',
    memCache({
        max: 100,
        ttl: CACHE_SECONDS * 1000,
    })
);

// 首页重定向
// 当未配置 HOME_REDIRECT_URL 时，默认重定向到项目文档地址
app.get('/migu', c => {
    return c.redirect(
        getEnv<{ HOME_REDIRECT_URL: string }>(c).HOME_REDIRECT_URL || 'https://domdkw.github.io/miguMusic-api-enhanced/'
        ,301
    );
});

// 健康检查
app.get('/migu/status', c => {
    const USE_DATABASE = getEnv<{ USE_DATABASE: string }>(c).USE_DATABASE === 'true';
    const ALLOWED_ORIGINS = getEnv<{ ALLOWED_ORIGINS: string }>(c).ALLOWED_ORIGINS || '';

    return c.json({
        message: 'Migu API Enhanced',
        version: pkg.version,
        runtime: getRuntimeKey(),
        dbEnabled: USE_DATABASE,
        allowedOrigins: ALLOWED_ORIGINS,
    });
});

// API 路由
app.route('/migu', apiRoutes);

// 404 处理
app.notFound(c => {
    return c.json(
        {
            success: false,
            error: 'Not Found',
            message: '请求的资源不存在',
        },
        404
    );
});

// 全局错误处理
app.onError((err, c) => {
    return c.json(
        {
            success: false,
            error: 'Internal Server Error',
            message: err.message,
        },
        500
    );
});

export default app;
