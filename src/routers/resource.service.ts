import type { Hono } from 'hono';
import { getVersion } from '../modules/version';
import { getResourceInfo } from '../modules/resourceinfo';
import { getLyric } from '../modules/lyric';
import { getSongInfoByContentIds, getSongInfoBySongIds } from '../modules/song_info';
import { getMrc } from '../modules/mrc';
import { getSongIds } from '../modules/song_ids';


export default function (app: Hono) {
    app.get('/version', async (c) => {
        const data = await getVersion();
        return c.json({ success: true, ...data });
    });

    app.get('/resourceinfo', async (c) => {
        const resourceIds = c.req.query('resourceIds') ?? '';
        const copyrightIds = c.req.query('copyrightIds') ?? '';
        const resourceType = c.req.query('resourceType') ?? 2;
        const data = await getResourceInfo(resourceIds, copyrightIds, Number(resourceType));
        return c.json({ success: true, ...data });
    });

    app.get('/songinfo/contentId', async c => 
        c.json({ success: true, ...(await getSongInfoByContentIds(c.req.query('contentIds') ?? ''))})
    );

    app.get('/songinfo/songId', async c => 
        c.json({ success: true, ...(await getSongInfoBySongIds(c.req.query('songIds') ?? ''))})
    );

    app.get('/songinfo/songId/simple', async c => 
        c.json({ success: true, ...(await getSongIds(c.req.query('songId') ?? ''))})
    );

    app.get('/lyric', async (c) => {
        const contentId = c.req.query('contentId') ?? '';
        const type = c.req.query('type') ?? 'lrc';
        if(!type) return c.json({success:false,error:'type is required'},400);
        const data = await getLyric(contentId,type);
        return c.json(data); // 不用套success,内部已处理,更详细
    });

    app.get('/mrc', async (c) => {
        const contentId = c.req.query('contentId') ?? '';
        const type = c.req.query('type') ?? 'standard';
        if(!type) return c.json({success:false,error:'type is required'},400);
        const data = await getMrc(contentId,type);
        return c.json(data);
    });
}
