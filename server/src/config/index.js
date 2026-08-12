require('dotenv').config();

console.log('ENV check:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
  WECHAT_APPID: process.env.WECHAT_APPID || 'NOT SET',
  WECHAT_SECRET: process.env.WECHAT_SECRET ? 'SET' : 'NOT SET',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
});

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'campus-express-secret-key',
  WECHAT_APPID: process.env.WECHAT_APPID || '',
  WECHAT_SECRET: process.env.WECHAT_SECRET || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  PORT: process.env.PORT || 3000,
};
