import type { Hono } from 'hono';
import { getPacmToken } from '../modules/passport_pacmToken';
import { checkToken } from '../modules/passport_checkToken';
import { loginSim } from '../modules/login_sim';
import { loginPhone } from '../modules/login_phone';
import { logout } from '../modules/passport_logout';
import { saveSession, clearSession, resolvePacmToken, refreshPacmToken } from '../utils/pacmSession';

export default function (app: Hono) {
    app.get('/passport/getPacmToken', async (c) => {
        const token = c.req.query('token') ?? '';
        const type = c.req.query('type') ?? '2';
        const sourceId = c.req.query('sourceId') ?? '220029';
        const data = await getPacmToken(token, type, sourceId, 'MUSIC-WWW');
        if(data.body && data.body.error && data.body.error !== ''){
            return c.json({ success: false, error: data.body.error });
        }
        return c.json({ success: true, ...data });
    });

    app.get('/passport/checkToken', async (c) => {
        // 不传 pacmtoken 时验 KV 里存的会话
        const { token } = await resolvePacmToken(c);
        const data = await checkToken(token);
        const code = data.code?.toString() || '';
        if(code !== '000000'){
            return c.json({ success: false, error: data });
        }
        return c.json({ success: true, ...data });
    });

    // 刷新 KV 里存的登录态：验活 → 死了就用 ST 换新的 → ST 也死了就报会话失效。
    // 不自动重新登录；失败时只报状态。定时任务与手动触发都走这里。
    app.get('/passport/refresh', async (c) => {
        const result = await refreshPacmToken();
        const ok = result.status === 'alive' || result.status === 'refreshed';
        return c.json({ success: ok, ...result });
    });

    app.get('/passport/logout', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const data = await logout(pacmtoken);
        // 退出的是存量会话、且咪咕确认退出成功时，才清掉 KV 里的登录态
        let sessionCleared = false;
        if (fromStore && data?.code?.toString() === '000000') {
            sessionCleared = await clearSession();
        }
        return c.json({ success: true, ...data, pacmtoken: '', sessionCleared });
    });

    app.get('/login/sim/send', async(c) => {
        const phone = c.req.query('phone') ?? '';
        const data = await loginSim.simSend(phone);
        if(data.error && data.error !== ''){
            return c.json({ success: false, error: data.error });
        }
        
        return c.json({ success: true, ...data });
    })

    app.get('/login/sim/query', async (c) => {
        const sim_sessionid = c.req.query('sessionId') ?? '';
        const isNeedPacm = c.req.query('isNeedPacm') ?? 'false';
        const authnData = await loginSim.simQuery(sim_sessionid);
        //console.log(authnData)

        if(authnData.error && authnData.error !== ''){
            return c.json({ success: false, error: authnData.body });
        }
        
        // 检查是否需要pacmtoken
        if(isNeedPacm === 'false' || isNeedPacm === '0' || !isNeedPacm){
            // 不需要pacmtoken, 直接返回authnData
            return c.json({ success: true, data: authnData });
        }

        // ===需要分支
        const status = authnData?.status?.toString() || '';

        // 状态码为2000时,成功
        if(status !== '2000'){
            return c.json({ success: false, error: authnData });
        }

        const token = authnData?.token || '';
        // 需要pacmtoken, 同步pacmtoken
        const pacmtokenData = await getPacmToken(token);

        if(pacmtokenData.body && pacmtokenData.body.error && pacmtokenData.body.error !== ''){
            return c.json({ success: false, error: pacmtokenData.body.error });
        }

        // 登录成功，把登录态写进 KV：以后不用再传 pacmtoken，服务端自动续期
        const sessionStored = await saveSession({
            pacmtoken: pacmtokenData.pacmToken || '',
            stToken: token,
            loginMethod: 'sim',
            updatedAt: new Date().toISOString(),
        });

        return c.json({ success: true, data: pacmtokenData, token: token, sessionStored });
    });

    app.get('/login/phone/msgCode', async(c) => {
        const phone = c.req.query('phone') ?? '';
        const data = await loginPhone.getMsgCode(phone);
        if(data.status.toString() !== '2000'){
            return c.json({ success: false, error: data });
        }
        
        return c.json({ success: true, ...data });
    })

    app.get('/login/phone/authn', async(c) => {
        const phone = c.req.query('phone') ?? '';
        const msgCode = c.req.query('msgCode') ?? '';
        const isNeedPacm = c.req.query('isNeedPacm') ?? 'false';

        const data = await loginPhone.authn(phone, msgCode);
        if(data.error && data.error !== ''){
            return c.json({ success: false, error: data });
        }
        
        if(isNeedPacm === 'false' || isNeedPacm === '0' || !isNeedPacm){
            return c.json({ success: true, data, token: data?.result?.token || ''});
        }
        
        // ===需要分支
        const status = data?.status?.toString() || '';

        // 状态码为2000时,成功
        if(status !== '2000'){
            return c.json({ success: false, error: data });
        }

        //token路径与loginSim不同, 从result中获取
        const token = data?.result?.token || '';
        // 需要pacmtoken, 同步pacmtoken
        const pacmtokenData = await getPacmToken(token);

        if(pacmtokenData.body && pacmtokenData.body.error && pacmtokenData.body.error !== ''){
            return c.json({ success: false, error: pacmtokenData.body.error });
        }

        // 登录成功，把登录态写进 KV：以后不用再传 pacmtoken，服务端自动续期
        const sessionStored = await saveSession({
            pacmtoken: pacmtokenData.pacmToken || '',
            stToken: token,
            loginMethod: 'phone',
            phone,
            updatedAt: new Date().toISOString(),
        });

        return c.json({ success: true, data: pacmtokenData, token: token, sessionStored });
    })
}
