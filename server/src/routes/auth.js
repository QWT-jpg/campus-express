const Router = require('koa-router');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const config = require('../config');

const router = new Router();
const prisma = new PrismaClient();

/**
 * POST /auth/login
 * WeChat mini-program login.
 * Body: { code }
 * Returns JWT token with userId and role.
 */
router.post('/login', async (ctx) => {
  try {
    const { code } = ctx.request.body;

    if (!code) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '缺少登录凭证 code' };
      return;
    }

    // Exchange code for openid via WeChat API
    const wxUrl = 'https://api.weixin.qq.com/sns/jscode2session';
    const wxRes = await axios.get(wxUrl, {
      params: {
        appid: config.WECHAT_APPID,
        secret: config.WECHAT_SECRET,
        js_code: code,
        grant_type: 'authorization_code',
      },
    });

    const { openid, errcode, errmsg } = wxRes.data;
    console.log('WeChat login response:', JSON.stringify(wxRes.data));

    if (errcode || !openid) {
      console.error('WeChat login error:', errcode, errmsg);
      ctx.status = 400;
      ctx.body = { code: 1000, message: `微信登录失败: ${errmsg || '未知错误'}(${errcode})` };
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { openid } });

    if (!user) {
      user = await prisma.user.create({
        data: { openid },
      });
    }

    // Check user status
    if (user.status !== 1) {
      ctx.status = 403;
      ctx.body = { code: 1000, message: '账号已被禁用，请联系管理员' };
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        token,
        user: {
          id: user.id,
          openid: user.openid,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          role: user.role,
        },
      },
    };
  } catch (err) {
    console.error('Auth login error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

/**
 * POST /auth/admin-login
 * Admin web login. Supports both master password and personal passwords.
 * Body: { password, userId? }
 * - If only password: checks master ADMIN_PASSWORD
 * - If userId + password: checks user's personal password (user must have role >= 1)
 */
router.post('/admin-login', async (ctx) => {
  try {
    const { password, userId } = ctx.request.body;

    if (!password) {
      ctx.status = 400;
      ctx.body = { code: 1000, message: '请输入密码' };
      return;
    }

    let admin = null;

    if (userId) {
      // Personal password login
      admin = await prisma.user.findFirst({
        where: { id: parseInt(userId), role: { gte: 1 }, password: { not: null } },
      });
      if (!admin || admin.password !== password) {
        ctx.status = 401;
        ctx.body = { code: 1000, message: '账号或密码错误' };
        return;
      }
    } else {
      // Master password login
      if (password !== config.ADMIN_PASSWORD) {
        ctx.status = 401;
        ctx.body = { code: 1000, message: '密码错误' };
        return;
      }
      // Find or create default admin
      admin = await prisma.user.findFirst({ where: { role: 2 } });
      if (!admin) {
        admin = await prisma.user.create({
          data: { openid: 'admin_' + Date.now(), nickname: '管理员', role: 2 },
        });
      }
    }

    const token = jwt.sign(
      { userId: admin.id, role: admin.role },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    ctx.body = {
      code: 0,
      message: 'success',
      data: {
        token,
        user: {
          id: admin.id,
          nickname: admin.nickname,
          role: admin.role,
        },
      },
    };
  } catch (err) {
    console.error('Admin login error:', err);
    ctx.status = 500;
    ctx.body = { code: 5000, message: '服务器内部错误' };
  }
});

module.exports = router;
