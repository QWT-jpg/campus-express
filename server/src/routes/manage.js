const Router = require('koa-router');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = new Router();
const prisma = new PrismaClient();

/**
 * Role check middleware: requires role >= 1 (member or admin)
 */
async function requireMember(ctx, next) {
  const { role } = ctx.state.user;
  if (role < 1) {
    ctx.status = 403;
    ctx.body = { code: 1000, message: '权限不足，需要配送员或管理员权限' };
    return;
  }
  await next();
}

// Apply auth + role check to all routes in this router
router.use(auth);
router.use(requireMember);

/**
 * GET /manage/today
 * Get today's ACTIVE orders (status 0/1/2, not cancelled).
 * Supports ?station=xxx filter.
 * Returns grouped by building.
 */
router.get('/today', async (ctx) => {
  try {
    const { station, building } = ctx.query;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const where = {
      createdAt: { gte: todayStart, lte: todayEnd },
      status: { in: [0, 1] },
      cancelledAt: null,
      ...(station && { station }),
      ...(building && { building }),
    };

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Split: unverified and verified
    const unverified = orders.filter(o => o.verified !== 1);
    const verified = orders.filter(o => o.verified === 1);

    function groupByBuilding(list) {
      const map = {};
      for (const order of list) {
        const key = order.building;
        if (!map[key]) {
          map[key] = { building: key, count: 0, orders: [] };
        }
        map[key].count++;
        map[key].orders.push(order);
      }
      // Sort orders within each building: status 0 (未取件) before status 1 (已取件)
      for (const g of Object.values(map)) {
        g.orders.sort((a, b) => a.status - b.status);
      }
      return Object.values(map);
    }

    ctx.body = {
      code: 0, message: 'success',
      data: {
        unverified: groupByBuilding(unverified),
        verified: groupByBuilding(verified),
      },
    };
  } catch (err) {
    console.error('Get today orders error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /manage/history
 * Get completed/cancelled orders with pagination.
 * Query: ?page=1&pageSize=20&station=xxx
 * Completed = status 3 (confirmed) or status -1 (cancelled)
 */
router.get('/history', async (ctx) => {
  try {
    const page = parseInt(ctx.query.page) || 1;
    const pageSize = Math.min(parseInt(ctx.query.pageSize) || 20, 50);
    const { station, date, building } = ctx.query;

    // Date filter: if specified, only return orders from that date
    let dateFilter = {};
    if (date) {
      const dateStart = new Date(date + 'T00:00:00');
      const dateEnd = new Date(date + 'T23:59:59.999');
      if (!isNaN(dateStart.getTime())) {
        dateFilter = { gte: dateStart, lte: dateEnd };
      }
    }

    const where = {
      OR: [
        { status: 2, ...(dateFilter && { deliveredAt: dateFilter }) },
        { status: 3, ...(dateFilter && { confirmedAt: dateFilter }) },
        { status: -1, ...(dateFilter && { cancelledAt: dateFilter }) },
      ],
      ...(station && { station }),
      ...(building && { building }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { confirmedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    // Group by date, then by building within each date
    const dateGroups = [];
    const dateMap = new Map();
    for (const order of orders) {
      const d = order.deliveredAt || order.confirmedAt || order.cancelledAt || order.updatedAt;
      const dateStr = d.toISOString().split('T')[0];
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { date: dateStr, buildingMap: new Map() });
        dateGroups.push(dateMap.get(dateStr));
      }
      const dateGroup = dateMap.get(dateStr);
      const b = order.building || '未知';
      if (!dateGroup.buildingMap.has(b)) {
        dateGroup.buildingMap.set(b, { building: b, count: 0, orders: [] });
      }
      const bg = dateGroup.buildingMap.get(b);
      bg.count++;
      bg.orders.push(order);
    }
    // Convert buildingMap to array for each date
    for (const dg of dateGroups) {
      dg.buildings = Array.from(dg.buildingMap.values());
      delete dg.buildingMap;
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        dateGroups,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    };
  } catch (err) {
    console.error('Get history orders error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/verify
 * Admin verifies store order.
 * Body: { action: "pass" | "reject" }
 */
router.post('/:id/verify', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const orderId = parseInt(ctx.params.id, 10);
    const { action, packageType } = ctx.request.body;

    if (isNaN(orderId)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单ID无效' };
      return;
    }

    if (!action || !['pass', 'reject'].includes(action)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '操作类型无效，必须是 pass 或 reject' };
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      ctx.status = 404;
      ctx.body = { code: 3000, message: '订单不存在' };
      return;
    }

    const verified = action === 'pass' ? 1 : 2;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        verified,
        verifiedBy: userId,
        verifiedAt: new Date(),
        ...(packageType ? { packageType } : {}),
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Verify order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/pick
 * Mark order as picked (status 1).
 */
router.post('/:id/pick', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const orderId = parseInt(ctx.params.id, 10);

    if (isNaN(orderId)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单ID无效' };
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      ctx.status = 404;
      ctx.body = { code: 3000, message: '订单不存在' };
      return;
    }

    if (order.status !== 0) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '只能取件待处理状态的订单' };
      return;
    }

    if (order.cancelledAt) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '已取消的订单无法操作' };
      return;
    }

    if (order.verified !== 1) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '请先核验通过后再取件' };
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 1,
        pickedBy: userId,
        pickedAt: new Date(),
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Pick order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/deliver
 * Mark order as delivered (status 2).
 */
router.post('/:id/deliver', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const orderId = parseInt(ctx.params.id, 10);

    if (isNaN(orderId)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单ID无效' };
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      ctx.status = 404;
      ctx.body = { code: 3000, message: '订单不存在' };
      return;
    }

    if (order.status !== 1) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '只能送达已取件的订单' };
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 2,
        deliveredBy: userId,
        deliveredAt: new Date(),
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Deliver order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/batch-pick
 * Batch mark orders as picked (status 1).
 * Body: { ids: [1, 2, 3] }
 */
router.post('/batch-pick', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { ids } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '请提供要操作的订单ID列表' };
      return;
    }

    const result = await prisma.order.updateMany({
      where: {
        id: { in: ids },
        status: 0,
        verified: 1,
        cancelledAt: null,
      },
      data: {
        status: 1,
        pickedBy: userId,
        pickedAt: new Date(),
      },
    });

    ctx.body = {
      code: 0,
      message: 'success',
      data: { count: result.count, total: ids.length },
    };
  } catch (err) {
    console.error('Batch pick error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/batch-deliver
 * Batch mark orders as delivered (status 2).
 * Body: { ids: [1, 2, 3] }
 */
router.post('/batch-deliver', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { ids } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '请提供要操作的订单ID列表' };
      return;
    }

    const result = await prisma.order.updateMany({
      where: {
        id: { in: ids },
        status: 1,
      },
      data: {
        status: 2,
        deliveredBy: userId,
        deliveredAt: new Date(),
      },
    });

    ctx.body = {
      code: 0,
      message: 'success',
      data: { count: result.count, total: ids.length },
    };
  } catch (err) {
    console.error('Batch deliver error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/cancel
 * Cancel an order.
 */
router.post('/:id/cancel', async (ctx) => {
  try {
    const orderId = parseInt(ctx.params.id, 10);
    const { reason } = ctx.request.body || {};

    if (isNaN(orderId)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单ID无效' };
      return;
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      ctx.status = 404;
      ctx.body = { code: 3000, message: '订单不存在' };
      return;
    }

    if (order.status === 3) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '已确认的订单无法取消' };
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: -1,  // mark as cancelled
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Cancel order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /manage/batch-verify
 * Batch verify orders by store order numbers.
 * Body: { orders: ["wx001", "wx002", ...] }
 * Returns 4 groups: matched, notFound, alreadyVerified, cancelled
 */
router.post('/batch-verify', async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { orders } = ctx.request.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '请提供店铺订单号列表' };
      return;
    }

    // Clean and deduplicate
    const cleaned = [...new Set(orders.map(o => String(o).trim()).filter(Boolean))];

    // Find existing orders by storeOrder
    const existingOrders = await prisma.order.findMany({
      where: { storeOrder: { in: cleaned } },
    });

    const existingMap = new Map();
    for (const o of existingOrders) {
      existingMap.set(o.storeOrder, o);
    }

    const matched = [];
    const notFound = [];
    const alreadyVerified = [];
    const cancelled = [];

    for (const sno of cleaned) {
      const order = existingMap.get(sno);
      if (!order) {
        notFound.push(sno);
      } else if (order.cancelledAt) {
        cancelled.push(order);
      } else if (order.verified === 1) {
        alreadyVerified.push(order);
      } else {
        matched.push(order);
      }
    }

    ctx.body = {
      code: 0,
      message: 'success',
      data: { matched, notFound, alreadyVerified, cancelled, total: cleaned.length },
    };
  } catch (err) {
    console.error('Batch verify error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /manage/stats
 * Today's stats (accessible to members)
 */
router.get('/stats', async (ctx) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayFilter = { createdAt: { gte: todayStart, lte: todayEnd } };

    const [totalOrders, pickedCount, deliveredCount, confirmedCount, allTodayOrders] = await Promise.all([
      prisma.order.count({ where: todayFilter }),
      prisma.order.count({ where: { ...todayFilter, status: 1 } }),
      prisma.order.count({ where: { ...todayFilter, status: 2 } }),
      prisma.order.count({ where: { ...todayFilter, status: 3 } }),
      prisma.order.findMany({ where: todayFilter, select: { building: true } }),
    ]);

    const buildingCounts = {};
    for (const order of allTodayOrders) {
      const b = order.building;
      buildingCounts[b] = (buildingCounts[b] || 0) + 1;
    }
    const buildings = Object.entries(buildingCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    ctx.body = { code: 0, message: 'success', data: { total: totalOrders, picked: pickedCount, delivered: deliveredCount, confirmed: confirmedCount, buildings } };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
