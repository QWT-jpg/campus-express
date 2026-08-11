# ☁️ 免费云部署方案：TiDB Cloud + Render

> 后端托管到云端，电脑不用开机，24 小时在线，**完全免费**。

---

## 第一步：TiDB Cloud（免费 MySQL）

1. 打开 https://tidbcloud.com → 注册 → 登录
2. 左侧菜单 → **Clusters** → **Create Cluster** → 选 **Serverless**（免费）
3. 创建后 → 点 **Connect** → 选 **Standard** → 复制连接串

连接串长这样：
```
mysql://xxxx.root:password@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/test?sslaccept=strict
```

4. 在 TiDB Cloud 控制台 → **Chat2Query**（或 SQL Editor） → 执行建库：

```sql
CREATE DATABASE campus_express CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

5. 把连接串里的 `test` 改成 `campus_express`：

```
mysql://xxxx.root:password@gateway01......com:4000/campus_express?sslaccept=strict
```

---

## 第二步：Render（免费 Node.js 托管）

1. 打开 https://render.com → 注册（GitHub 登录）

2. **New** → **Web Service** → 连接你的 GitHub 仓库

3. 配置：
   | 字段 | 值 |
   |---|---|
   | Root Directory | `server` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |

4. **Environment Variables**（Environment → Add）：
   | Key | Value |
   |---|---|
   | DATABASE_URL | （TiDB 连接串，campus_express 那个） |
   | JWT_SECRET | `84febb635545354ecc7e9fa85668f616ea553e8ec6d2444d204d763ab6a73bf96b270a83e61abedcdb86ce13830392aeef427e3b6270b30b602d4efb3af75c11` |
   | WECHAT_APPID | `wx4f09c93b9f03d739` |
   | WECHAT_SECRET | `d641db0bc56c4162925392c4e5eb20f0` |
   | ADMIN_PASSWORD | `290d4bae5717579530c5338f71833ec5` |

5. 点 **Create Web Service** → 等 3 分钟

6. 部署成功后 → 点 **Shell**（左侧）→ 执行：
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

7. 浏览器访问 `https://你的服务名.onrender.com/ping` → 看到 `{"code":0,"message":"pong"}` 就通了。

---

## 第三步：连上小程序

1. 把 `miniprogram/src/config.ts` 的 `API_BASE_URL` 改成 Render 域名：
   ```ts
   export const API_BASE_URL = 'https://你的服务名.onrender.com'
   ```

2. 编译小程序：
   ```bash
   cd miniprogram && npx taro build --type weapp
   ```

3. 微信小程序后台 `mp.weixin.qq.com` → 开发管理 → 服务器域名：
   - **request 合法域名**：添加 `https://你的服务名.onrender.com`

4. 微信开发者工具 → 上传

---

## 第四步（推荐）：防止 Render 休眠

Render 免费版 15 分钟无请求会休眠，唤醒要 30-50 秒。

1. 打开 https://uptimerobot.com → 注册（免费）
2. **New Monitor** → URL 填 `https://你的服务名.onrender.com/ping`
3. **Monitoring Interval** 选 5 分钟
4. 保存。这样每 5 分钟 ping 一次，Render 永远不会休眠。

---

## 费用：0 元

| 服务 | 免费额度 | 够用吗 |
|---|---|---|
| TiDB Cloud Serverless | 5GB 存储 / 每月 5000 万请求 | ✅ 校园场景随便用 |
| Render Web Service | 每月 750 小时（正好一个月） | ✅ |
| UptimeRobot | 5 分钟间隔 | ✅ |

---

## 管理后台

管理后台 (`admin/`) 是纯前端，可以部署到 **Vercel** 或 **GitHub Pages**：

```bash
cd admin && npm run build
# 把 dist/ 上传到 Vercel 或 GitHub Pages
```

记得把 `admin/src/api/index.js` 里的 `baseURL: '/api'` 改成 `baseURL: 'https://你的服务名.onrender.com'`。
