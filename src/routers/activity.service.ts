import type { Hono } from 'hono';
import { resolvePacmToken, noteRotatedPacmToken } from '../utils/pacmSession';
import { getNinanSong, getNinanByDate, getNinanSignInfo, signNinan } from '../modules/ninan';
import { signAiBean, getAiBeanCount, getAiBeanSignStatus, redeemAiBean } from '../modules/ai-bean';
import { getActivities } from '../modules/activities';

export default function (app: Hono) {
    app.get('/activity/release', async (c) =>
        c.json({ success: true, ...(await getActivities()) })
    );

    app.get('/activity/ninan/song', async (c) =>
        c.json({ success: true, ...(await getNinanSong()) })
    );

    app.get('/activity/ninan/date', async (c) => 
        c.json({ success: true, ...(await getNinanByDate(c.req.query('date') ?? '')) })
    );

    app.get('/activity/ninan/sign/info', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await getNinanSignInfo(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/activity/ninan/sign', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await signNinan(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/activity/ai-bean/sign', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await signAiBean(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/activity/ai-bean/count', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await getAiBeanCount(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/activity/ai-bean/status', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await getAiBeanSignStatus(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });

    app.get('/activity/ai-bean/redeem', async (c) => {
        const { token: pacmtoken, fromStore } = await resolvePacmToken(c);
        const {data, newPacmToken} = await redeemAiBean(pacmtoken);
        await noteRotatedPacmToken(fromStore, newPacmToken);
        return c.json({ success: true, ...data, pacmtoken: newPacmToken });
    });
}
