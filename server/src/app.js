const Koa = require('koa');
const cors = require('@koa/cors');
const { koaBody } = require('koa-body');
const serve = require('koa-static');
const mount = require('koa-mount');
const path = require('path');
const router = require('./routes');
const config = require('./config');

const app = new Koa();

// CORS middleware
app.use(cors());

// Static file serving for uploads (mounted at /uploads)
const uploadsPath = path.join(__dirname, '..', 'src', 'uploads');
app.use(mount('/uploads', serve(uploadsPath)));

// Body parser middleware
app.use(koaBody({
  json: true,
  multipart: true,
  formidable: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
}));

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Unhandled error:', err);
    ctx.status = err.status || 500;
    ctx.body = {
      code: 5000,
      message: err.message || '服务器内部错误',
    };
  }
});

// Mount all routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});

module.exports = app;
