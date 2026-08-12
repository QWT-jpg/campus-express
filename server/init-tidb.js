// Run this to initialize TiDB Cloud database
const { execSync } = require('child_process');

const DATABASE_URL = 'mysql://T7GWE3hkgX6qTtk.root:gL0HjcGk4kqnLwbA@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/campus_express?sslaccept=strict';
process.env.DATABASE_URL = DATABASE_URL;

console.log('初始化 TiDB Cloud 数据库...');
execSync('npx prisma db push', { stdio: 'inherit', env: { ...process.env, DATABASE_URL } });
console.log('写入种子数据...');
execSync('node prisma/seed.js', { stdio: 'inherit', env: { ...process.env, DATABASE_URL } });
console.log('完成！');
