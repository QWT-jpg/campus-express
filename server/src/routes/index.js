const Router = require('koa-router');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./auth');
const userRoutes = require('./user');
const orderRoutes = require('./order');
const manageRoutes = require('./manage');
const adminRoutes = require('./admin');

const router = new Router();
const prisma = new PrismaClient();

// Health check for UptimeRobot
router.get('/ping', ctx => { ctx.body = { code: 0, message: 'pong' } });

// Mount all route groups with proper prefixes
router.use('/auth', authRoutes.routes(), authRoutes.allowedMethods());
router.use('/user', userRoutes.routes(), userRoutes.allowedMethods());
router.use('/orders', orderRoutes.routes(), orderRoutes.allowedMethods());
router.use('/manage', manageRoutes.routes(), manageRoutes.allowedMethods());
router.use('/admin', adminRoutes.routes(), adminRoutes.allowedMethods());

/**
 * GET /config
 * Public endpoint: returns stations and buildings.
 * No auth required — used by mini-program home page to render the order form.
 */
router.get('/config', async (ctx) => {
  try {
    const configs = await prisma.config.findMany();

    const result = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        stations: result.stations || [],
        buildings: result.buildings || [],
        contact: result.contact || {},
        announcement: result.announcement || '',
      },
    };
  } catch (err) {
    console.error('Get public config error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
