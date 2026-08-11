const Router = require('koa-router');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { auth } = require('../middleware/auth');

const router = new Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * GET /user/profile
 * Returns current user info (auth required).
 */
router.get('/profile', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
    });

    if (!user) {
      ctx.status = 404;
      ctx.body = { code: 1000, message: '用户不存在' };
      return;
    }

    ctx.body = { code: 0, message: 'success', data: user };
  } catch (err) {
    console.error('Get profile error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * PUT /user/profile
 * Update user nickname / phone (auth required).
 * Body: { phone?, nickname? }
 */
router.put('/profile', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const { phone, nickname } = ctx.request.body;

    if (phone !== undefined && phone !== null && !/^1\d{10}$/.test(phone)) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '手机号格式不正确' };
      return;
    }

    const updateData = {};
    if (phone !== undefined) updateData.phone = phone;
    if (nickname !== undefined) updateData.nickname = nickname;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    ctx.body = { code: 0, message: 'success', data: user };
  } catch (err) {
    console.error('Update profile error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /user/avatar
 * Upload avatar image (auth required).
 */
router.post('/avatar', auth, async (ctx) => {
  try {
    const { userId } = ctx.state.user;
    const file = ctx.request.files?.avatar;

    if (!file) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '请选择头像文件' };
      return;
    }

    // Generate unique filename
    const ext = path.extname(file.originalFilename || file.newFilename || '.png') || '.png';
    const filename = `avatar_${userId}_${Date.now()}${ext}`;
    const destPath = path.join(uploadsDir, filename);

    // Move file to uploads directory
    const reader = fs.createReadStream(file.filepath || file.path);
    const writer = fs.createWriteStream(destPath);
    reader.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const avatarUrl = `/uploads/${filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    ctx.body = { code: 0, message: 'success', data: { avatarUrl } };
  } catch (err) {
    console.error('Upload avatar error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
