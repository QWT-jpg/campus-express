const Router = require('koa-router');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = new Router();
const prisma = new PrismaClient();

/**
 * Generate order number: "DP" + YYYYMMDD + random 4 digits
 */
function generateOrderNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `DP${y}${m}${d}${rand}`;
}

/**
 * POST /orders
 * Create a new order (auth required).
 * Body: { station, building, room?, storeOrder, pickCode?, senderPhone? }
 */
router.post('/', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { station, building, room, storeOrder, pickCode, packageType, senderPhone } = ctx.request.body;

    // Validate required fields
    if (!station || !building || !storeOrder || !pickCode) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '驿站、楼栋、商家订单号和取件码不能为空' };
      return;
    }

    // Check storeOrder uniqueness
    const existing = await prisma.order.findUnique({ where: { storeOrder } });
    if (existing) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '该商家订单号已存在' };
      return;
    }

    // Auto-generate orderNo
    const orderNo = generateOrderNo();

    const order = await prisma.order.create({
      data: {
        orderNo,
        station,
        building,
        room: room || null,
        storeOrder,
        pickCode: pickCode || null,
        packageType: packageType || null,
        senderId: userId,
        senderPhone: senderPhone || null,
      },
    });

    ctx.body = { code: 0, message: 'success', data: order };
  } catch (err) {
    console.error('Create order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /orders/mine
 * List current user's orders.
 * Query: ?type=active (default, status 0/1/2) or ?type=history (status 3/-1)
 * History supports pagination: ?type=history&page=1&pageSize=20
 */
router.get('/mine', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const type = ctx.query.type || 'active';
    const page = parseInt(ctx.query.page) || 1;
    const pageSize = Math.min(parseInt(ctx.query.pageSize) || 20, 50);
    const date = ctx.query.date;

    let where = { senderId: userId };

    // Date filter for history
    let dateFilter = {};
    if (type === 'history' && date) {
      const ds = new Date(date + 'T00:00:00');
      const de = new Date(date + 'T23:59:59.999');
      if (!isNaN(ds.getTime())) dateFilter = { gte: ds, lte: de };
    }

    if (type === 'history') {
      where.OR = [
        { status: 2, ...(date ? { deliveredAt: dateFilter } : {}) },
        { status: 3, ...(date ? { confirmedAt: dateFilter } : {}) },
        { status: -1, ...(date ? { cancelledAt: dateFilter } : {}) },
      ];
    } else {
      // active: status 0/1 and not cancelled
      where.status = { in: [0, 1] };
      where.cancelledAt = null;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    if (type === 'history') {
      // Group by date, then by building
      const dateGroups = [];
      const dateMap = new Map();
      for (const order of orders) {
        const d = order.deliveredAt || order.confirmedAt || order.cancelledAt || order.updatedAt;
        const dateStr = d.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { date: dateStr, buildingMap: new Map() });
          dateGroups.push(dateMap.get(dateStr));
        }
        const dg = dateMap.get(dateStr);
        const b = order.building || '未知';
        if (!dg.buildingMap.has(b)) {
          dg.buildingMap.set(b, { building: b, count: 0, orders: [] });
        }
        const bg = dg.buildingMap.get(b);
        bg.count++;
        bg.orders.push(order);
      }
      for (const dg of dateGroups) {
        dg.buildings = Array.from(dg.buildingMap.values());
        delete dg.buildingMap;
      }
      ctx.body = { code: 0, message: 'success', data: { dateGroups, total, page, pageSize, hasMore: page * pageSize < total } };
    } else {
      ctx.body = { code: 0, message: 'success', data: { orders, total, page, pageSize, hasMore: page * pageSize < total } };
    }
  } catch (err) {
    console.error('Get my orders error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * GET /orders/:id
 * Get order detail.
 */
router.get('/:id', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const orderId = parseInt(ctx.params.id, 10);

    if (isNaN(orderId)) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单ID无效' };
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      ctx.status = 404;
      ctx.body = { code: 3000, message: '订单不存在' };
      return;
    }

    // Only the order owner can view the detail (unless admin/member)
    if (order.senderId !== userId) {
      ctx.status = 403;
      ctx.body = { code: 3000, message: '无权查看此订单' };
      return;
    }

    ctx.body = { code: 0, message: 'success', data: order };
  } catch (err) {
    console.error('Get order detail error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/confirm
 * Confirm receipt: set status to 3, set confirmedAt.
 */
router.post('/:id/confirm', auth, async (ctx) => {
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

    if (order.senderId !== userId) {
      ctx.status = 403;
      ctx.body = { code: 3000, message: '无权操作此订单' };
      return;
    }

    // Only delivered orders can be confirmed
    if (order.status !== 2) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单尚未送达，无法确认' };
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 3,
        confirmedAt: new Date(),
      },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('Confirm order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /orders/:id/cancel
 * User cancels their own order (only if status=0, not yet picked).
 */
router.post('/:id/cancel', auth, async (ctx) => {
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

    if (order.senderId !== userId) {
      ctx.status = 403;
      ctx.body = { code: 3000, message: '无权操作此订单' };
      return;
    }

    if (order.status !== 0) {
      ctx.status = 400;
      ctx.body = { code: 3000, message: '订单已被取件，无法取消' };
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: -1, cancelledAt: new Date() },
    });

    ctx.body = { code: 0, message: 'success', data: updated };
  } catch (err) {
    console.error('User cancel order error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
