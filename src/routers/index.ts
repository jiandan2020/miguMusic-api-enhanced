import { Hono } from 'hono';

import searchService from './search.service';
import urlService from './url.service';
import passportService from './passport.service';
import resourceService from './resource.service';
import userService from './user.service';


const routes = new Hono();

const services = [
    searchService,
    urlService,
    passportService,
    resourceService,
    userService,
];

services.forEach(register => register(routes));

export default routes;
