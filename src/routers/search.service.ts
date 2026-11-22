import type { Hono } from 'hono';
import { searchSong } from '../modules/search';
import { getSearchHot } from '../modules/search_hot';


export default function (app: Hono) {
    app.get('/search', async (c) => {
        const text = c.req.query('text') ?? '';
        const page = c.req.query('page') ?? 1;
        const data = await searchSong(text, Number(page));
        return c.json({ success: true, ...data });
    });

    app.get('/search/hot', async (c) => {
        const data = await getSearchHot();
        return c.json({ success: true, ...data });
    });
}
