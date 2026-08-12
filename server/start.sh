#!/bin/sh
# Create database if not exists
node -e "
const mysql = require('mysql2/promise');
(async () => {
  const u = new URL(process.env.DATABASE_URL.replace('mysql://', 'http://'));
  const db = u.pathname.replace('/', '');
  const conn = await mysql.createConnection({
    host: u.hostname, port: u.port || 3306,
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password)
  });
  await conn.execute('CREATE DATABASE IF NOT EXISTS \`' + db + '\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  await conn.end();
  console.log('Database ready');
})().catch(e => { console.error('DB create error:', e.message); process.exit(1); });
"
# Push schema and seed
npx prisma db push
node prisma/seed.js
# Start server
node src/app.js
