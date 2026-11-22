import type { Context } from 'hono';
import { checkToken } from '../modules/passport_checkToken';

/**
 * pacmtoken 会话保活（登录一次，服务端续期）
 *
 * - 登录一次（SIM 快捷登录或手机验证码登录）后，登录态存在 EdgeOne KV 里，
 *   以后调需要 pacmtoken 的接口不用再传 `?pacmtoken=`，服务端自动用存量。
 * - 目前只有 `/user/info` 与 `/user/info/phone` 会在返回里带 `newPacmToken`，
 *   返回了新 token 时写回 KV（被动更新）；`/url/v2` 只用存量 token 做回退，不写回。
 * - 定时 / 手动刷新时：先 checkToken 验活；活着就更新 lastCheckedAt；
 *   死了就报 session_dead，等用户手动重新登录（不再拿 ST 换新：实测
 *   ST 换 token 只能换一次，登录时已经换过一次了，存着的 ST 换不到，
 *   咪咕返回 199999 空 token）。
 * - **不自动重新登录**：刷新路径里没有任何 SIM 发送、验证码、账号密码
 *   登录调用；会话彻底失效时只报状态，不会替用户登录。
 *
 * 存储：EdgeOne KV。KV 命名空间在控制台绑定到边缘函数后，以裸全局
 * 标识符注入（不在 context.env / process.env 里），这里用 globalThis
 * 加方法守卫读取，未绑定时所有读写返回 null / false，调用方按无会话处理。
 * KV 键名只允许字母数字下划线，所以会话键名用 `pacm_session`。
 * KV 本身没有 TTL，有效期由应用层记在值里（updatedAt / lastCheckedAt）。
 */

export interface PacmSession {
    /** 当前有效的 pacmtoken */
    pacmtoken: string;
    /** 登录时拿到的 ST token（仅作记录；实测 ST 换 token 只能换一次，登录时已用过，不再用于换新） */
    stToken: string;
    /** 当初登录的方式 */
    loginMethod: 'sim' | 'phone';
    /** 手机号（手机验证码登录时才有，仅作记录） */
    phone?: string;
    /** 会话上次更新时间（ISO） */
    updatedAt: string;
    /** 上次验证时间（ISO） */
    lastCheckedAt?: string;
}

const SESSION_KEY = 'pacm_session';
const KV_BINDING_NAME = 'MIGU_KV';

interface KvBinding {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export function getKvBinding(): KvBinding | null {
    const kv = (globalThis as Record<string, unknown>)[KV_BINDING_NAME] as KvBinding | undefined;
    if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
        return null;
    }
    return kv;
}

export function isKvAvailable(): boolean {
    return getKvBinding() !== null;
}

export async function getSession(): Promise<PacmSession | null> {
    const kv = getKvBinding();
    if (!kv) {
        return null;
    }
    let raw: string | null;
    try {
        raw = await kv.get(SESSION_KEY);
    } catch {
        return null;
    }
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<PacmSession>;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }
        // pacmtoken 与 stToken 至少要有一个非空，否则这条会话没法用
        const pacmtoken = typeof parsed.pacmtoken === 'string' ? parsed.pacmtoken : '';
        const stToken = typeof parsed.stToken === 'string' ? parsed.stToken : '';
        if (!pacmtoken && !stToken) {
            return null;
        }
        return {
            pacmtoken,
            stToken,
            loginMethod: parsed.loginMethod === 'phone' ? 'phone' : 'sim',
            phone: typeof parsed.phone === 'string' ? parsed.phone : undefined,
            updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
            lastCheckedAt: typeof parsed.lastCheckedAt === 'string' ? parsed.lastCheckedAt : undefined,
        };
    } catch {
        return null;
    }
}

export async function saveSession(session: PacmSession): Promise<boolean> {
    const kv = getKvBinding();
    if (!kv) {
        return false;
    }
    try {
        await kv.put(SESSION_KEY, JSON.stringify(session));
        return true;
    } catch {
        return false;
    }
}

export async function clearSession(): Promise<boolean> {
    const kv = getKvBinding();
    if (!kv || typeof kv.delete !== 'function') {
        return false;
    }
    try {
        await kv.delete(SESSION_KEY);
        return true;
    } catch {
        return false;
    }
}

export interface ResolvedPacmToken {
    token: string;
    /** 本次用的 token 是否来自 KV 存量 */
    fromStore: boolean;
}

/**
 * 取本次请求用的 pacmtoken：显式传参优先，否则用 KV 里存的。
 */
export async function resolvePacmToken(c: Context): Promise<ResolvedPacmToken> {
    const explicit = c.req.query('pacmtoken') ?? '';
    if (explicit) {
        return { token: explicit, fromStore: false };
    }
    const session = await getSession();
    if (session?.pacmtoken) {
        return { token: session.pacmtoken, fromStore: true };
    }
    return { token: '', fromStore: false };
}

/**
 * 接口返回里带了新的 pacmtoken 时写回 KV。
 * 只有本次请求用的是存量 token 才回写；调用方显式传了自己的 token
 * 就不碰存量，避免串号。
 */
export async function noteRotatedPacmToken(fromStore: boolean, newPacmToken: string | undefined): Promise<void> {
    if (!fromStore || !newPacmToken) {
        return;
    }
    const session = await getSession();
    if (!session || session.pacmtoken === newPacmToken) {
        return;
    }
    await saveSession({ ...session, pacmtoken: newPacmToken, updatedAt: new Date().toISOString() });
}

// 'refreshed' 目前不可达：ST 换 token 已移除（实测只能换一次）；保留该
// 状态值是为了兼容调用方（刷新接口与定时任务仍按 alive/refreshed 判成功）。
export type RefreshStatus = 'alive' | 'refreshed' | 'no_session' | 'session_dead' | 'kv_unavailable' | 'error';

export interface RefreshResult {
    status: RefreshStatus;
    kvBound: boolean;
    hasSession: boolean;
    loginMethod?: PacmSession['loginMethod'];
    updatedAt?: string;
    lastCheckedAt?: string;
    reason?: string;
}

function errorMessage(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/**
 * 验一个 pacmtoken 还活不活。
 * 咪咕返回体里的 code 为 000000 表示活着；网络不通时返回 transportError，
 * 与“token 死了”区分开——网络问题不能当成 token 失效处理。
 */
async function checkAlive(pacmtoken: string): Promise<{ alive: boolean; transportError: string | null }> {
    try {
        const data = await checkToken(pacmtoken);
        return { alive: data?.code?.toString() === '000000', transportError: null };
    } catch (err) {
        const code = (err as { response?: { data?: { code?: unknown } } })?.response?.data?.code;
        if (code !== undefined && code !== null) {
            return { alive: String(code) === '000000', transportError: null };
        }
        return { alive: false, transportError: errorMessage(err) };
    }
}

/**
 * 刷新一次会话：验活 → 活着就更新检查时间，死了就报会话失效。
 * 全程不重新登录，也不拿 ST 换 token（实测 ST 只能换一次）；失败时不重试、不发短信。
 */
export async function refreshPacmToken(): Promise<RefreshResult> {
    const kvBound = isKvAvailable();
    if (!kvBound) {
        return { status: 'kv_unavailable', kvBound, hasSession: false, reason: 'KV 未绑定（MIGU_KV）' };
    }
    const session = await getSession();
    if (!session) {
        return { status: 'no_session', kvBound, hasSession: false, reason: '还没有登录过，请先登录一次' };
    }
    const now = new Date().toISOString();
    const base = {
        kvBound,
        hasSession: true,
        loginMethod: session.loginMethod,
        updatedAt: session.updatedAt,
        lastCheckedAt: session.lastCheckedAt,
    };

    // 1) 先验活
    if (session.pacmtoken) {
        const { alive, transportError } = await checkAlive(session.pacmtoken);
        if (transportError) {
            return { ...base, status: 'error', reason: `验证 token 时请求失败：${transportError}` };
        }
        if (alive) {
            await saveSession({ ...session, lastCheckedAt: now });
            return { ...base, status: 'alive', lastCheckedAt: now };
        }
    }

    // 2) pacmtoken 死了或没有可用的 pacmtoken：不再拿 ST 换新——实测 ST
    // 换 token 只能换一次，登录时已经换过一次了，存着的 ST 换不到
    // （咪咕返回 199999 空 token）。直接报会话失效，等用户手动重新登录。
    return { ...base, status: 'session_dead', reason: 'pacmtoken 已失效，存着的 ST 已使用过、无法再次换取，需要手动重新登录' };
}
