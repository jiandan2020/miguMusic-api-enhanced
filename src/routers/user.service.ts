import type { Hono } from 'hono';
import { resolvePacmToken, noteRotatedPacmToken } from '../utils/pacmSession';
import { queryUserInfo } from '../modules/user_queryInfo';
import { getUserPhoneInfo } from '../modules/user_phoneInfo';

export default function (app: Hono) {
    app.get('/user/info', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await queryUserInfo(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/user/info/phone', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await getUserPhoneInfo(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });
}
