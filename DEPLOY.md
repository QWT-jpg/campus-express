# 上线部署指南

## 上线前安全检查清单

- [ ] 修改 MySQL root 密码为强密码
- [ ] 修改 `server/.env` 中的 `JWT_SECRET` 为随机长字符串（当前已生成）
- [ ] 修改 `server/.env` 中的 `ADMIN_PASSWORD` 为非默认值
- [ ] 购买域名并完成 ICP 备案（中国大陆服务器必须备案）
- [ ] 服务器配置 HTTPS 证书
- [ ] 小程序后台配置合法域名
- [ ] 小程序代码审核通过

---

## 1. 数据库安全

```sql
-- 修改 MySQL root 密码
ALTER USER 'root'@'localhost' IDENTIFIED BY '你的强密码';

-- 建议创建专用数据库用户
CREATE USER 'campus_express'@'localhost' IDENTIFIED BY '专用密码';
GRANT ALL PRIVILEGES ON campus_express.* TO 'campus_express'@'localhost';
FLUSH PRIVILEGES;
```

然后更新 `server/.env`：

```
DATABASE_URL="mysql://campus_express:专用密码@localhost:3306/campus_express"
```

---

## 2. HTTPS 证书配置

微信小程序要求 API 必须使用 HTTPS。推荐使用免费 Let's Encrypt 证书。

### 方案：Nginx 反向代理

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 使用 Certbot 获取免费证书

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com

# 设置自动续期
sudo certbot renew --dry-run
```

---

## 3. 小程序配置

### 修改 API 地址

编辑 `miniprogram/src/config.ts`：

```ts
export const API_BASE_URL = 'https://api.yourdomain.com'
```

### 微信小程序后台设置

登录 [mp.weixin.qq.com](https://mp.weixin.qq.com)：

1. **开发管理 → 开发设置 → 服务器域名**
   - request 合法域名：`https://api.yourdomain.com`
   - 只支持 HTTPS，不支持 IP 和 localhost

2. **设置 → 基本设置**：完善小程序名称、头像、简介

---

## 4. 环境变量最终配置

`server/.env` 生产环境示例：

```env
DATABASE_URL="mysql://campus_express:专用密码@localhost:3306/campus_express"
JWT_SECRET="84febb635545354ecc7e9fa85668f616..."
WECHAT_APPID="wx0af38c43f57a0db1"
WECHAT_SECRET="637f2d1f89eb4d1efc13f1109906a072"
ADMIN_PASSWORD="你的强密码"
PORT=3000
```

---

## 5. 启动生产服务

```bash
# 安装 PM2 进程守护
npm install -g pm2

# 启动后端
cd server
npm install
npx prisma db push
pm2 start src/app.js --name campus-express

# 编译管理后台（可部署到 Nginx 或 CDN）
cd ../admin
npm install
npm run build
# 将 dist/ 目录部署到 Web 服务器

# 编译小程序（上传到微信后台）
cd ../miniprogram
npm install --legacy-peer-deps
npx taro build --type weapp
# 在微信开发者工具中点击「上传」提交审核
```

---

## 6. 常见问题

| 问题 | 解决 |
|---|---|
| 小程序请求失败 | 检查域名是否正确备案、HTTPS 证书是否有效 |
| 数据库连接失败 | 检查防火墙是否开放 3306 端口、MySQL 是否启动 |
| 图片/文件上传失败 | uploadFile 域名也需要在小程序后台配置 |
| 用户登录失败 | 检查 WECHAT_APPID 和 WECHAT_SECRET 是否匹配 |
