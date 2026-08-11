const Router = require('koa-router');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = new Router();
const prisma = new PrismaClient();

/**
 * Admin check middleware: requires role === 2
 */
async function requireAdmin(ctx, next) {
  const { role } = ctx.state.user;
  if (role !== 2) {
    ctx.status = 403;
    ctx.body = { code: 1000, message: '权限不足，需要管理员权限' };
    return;
  }
  await next();
}

// Apply auth + admin check to all routes in this router
router.use(auth);
router.use(requireAdmin);

/**
 * GET /admin/config
 * Get all configs as { stations: [...], buildings: [...] }
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
        contact: result.contact || { phone: '', wechat: '', hours: '' },
        announcement: result.announcement || '',
      },
    };
  } catch (err) {
    console.error('Get config error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /admin/config/stations
 * Body: { stations: [...] }
 */
router.put('/config/stations', async (ctx) => {
  try {
    const { stations } = ctx.request.body;

    if (!stations || !Array.isArray(stations)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '驿站数据格式不正确' };
      return;
    }

    await prisma.config.upsert({
      where: { key: 'stations' },
      update: { value: stations },
      create: { key: 'stations', value: stations },
    });

    ctx.body = { code: 0, message: 'success', data: stations };
  } catch (err) {
    console.error('Update stations error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /admin/config/buildings
 * Body: { buildings: [...] }
 */
router.put('/config/buildings', async (ctx) => {
  try {
    const { buildings } = ctx.request.body;

    if (!buildings || !Array.isArray(buildings)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '楼栋数据格式不正确' };
      return;
    }

    await prisma.config.upsert({
      where: { key: 'buildings' },
      update: { value: buildings },
      create: { key: 'buildings', value: buildings },
    });

    ctx.body = { code: 0, message: 'success', data: buildings };
  } catch (err) {
    console.error('Update buildings error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /admin/members
 * List users with role >= 1
 */
router.get('/members', async (ctx) => {
  try {
    const members = await prisma.user.findMany({
      where: { role: { gte: 1 } },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    ctx.body = { code: 0, message: 'success', data: members };
  } catch (err) {
    console.error('Get members error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /admin/members
 * Add a member. Body: { openid? or userId? }
 */
router.post('/members', async (ctx) => {
  try {
    const { openid, userId } = ctx.request.body;

    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    } else if (openid) {
      user = await prisma.user.findUnique({ where: { openid } });
    } else {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '请提供用户 openid 或 userId' };
      return;
    }

    if (!user) {
      ctx.status = 404;
      ctx.body = { code: 1000, message: '用户不存在' };
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 1 },
      select: {
        id: true,
        openid: true,
        nickname: true,
        avatarUrl: true,
        phone: true,
        role: true,
        status: true,
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Add member error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * DELETE /admin/members/:id
 * Remove member: set role to 0.
 */
router.delete('/members/:id', async (ctx) => {
  try {
    const memberId = parseInt(ctx.params.id, 10);

    if (isNaN(memberId)) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '用户ID无效' };
      return;
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role: 0 },
      select: {
        id: true,
        openid: true,
        nickname: true,
        role: true,
        status: true,
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Remove member error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /admin/stats
 * Today's stats: total, picked, delivered, confirmed, per-building counts.
 */
router.get('/stats', async (ctx) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayFilter = {
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    };

    // Run all counts in parallel
    const [totalOrders, pickedCount, deliveredCount, confirmedCount, allTodayOrders] =
      await Promise.all([
        prisma.order.count({ where: todayFilter }),
        prisma.order.count({ where: { ...todayFilter, status: 1 } }),
        prisma.order.count({ where: { ...todayFilter, status: 2 } }),
        prisma.order.count({ where: { ...todayFilter, status: 3 } }),
        prisma.order.findMany({
          where: todayFilter,
          select: { building: true },
        }),
      ]);

    // Count per building
    const buildingCounts = {};
    for (const order of allTodayOrders) {
      const b = order.building;
      buildingCounts[b] = (buildingCounts[b] || 0) + 1;
    }

    // Convert to sorted array of { name, count }
    const buildings = Object.entries(buildingCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        total: totalOrders,
        picked: pickedCount,
        delivered: deliveredCount,
        confirmed: confirmedCount,
        buildings,
      },
    };
  } catch (err) {
    console.error('Get stats error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /admin/config/contact
 * Body: { phone, wechat, hours }
 */
router.put('/config/contact', async (ctx) => {
  try {
    const { phone, wechat, hours } = ctx.request.body;
    const value = { phone: phone || '', wechat: wechat || '', hours: hours || '' };

    await prisma.config.upsert({
      where: { key: 'contact' },
      update: { value },
      create: { key: 'contact', value },
    });

    ctx.body = { code: 0, message: 'success', data: value };
  } catch (err) {
    console.error('Update contact error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /admin/config/announcement
 * Body: { content }
 */
router.put('/config/announcement', async (ctx) => {
  try {
    const { content } = ctx.request.body;

    await prisma.config.upsert({
      where: { key: 'announcement' },
      update: { value: content || '' },
      create: { key: 'announcement', value: content || '' },
    });

    ctx.body = { code: 0, message: 'success', data: content };
  } catch (err) {
    console.error('Update announcement error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /admin/members/password
 * Set personal password for a member
 * Body: { userId, password }
 */
router.put('/members/password', async (ctx) => {
  try {
    const { userId, password } = ctx.request.body;
    if (!userId || !password) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '用户ID和密码不能为空' };
      return;
    }
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password },
    });
    ctx.body = { code: 0, message: '密码设置成功' };
  } catch (err) {
    console.error('Set password error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
