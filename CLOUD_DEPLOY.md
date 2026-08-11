# 零成本上云部署指南（Render + TiDB Cloud）

> 适合学生党：不用买域名、不用备案、不用开电脑，注册即用。
> 预计耗时：30 分钟（含等待数据库初始化）
> 最后校验：2026-08-11，所有步骤已对照项目代码确认

---

## 第一步：创建 TiDB Cloud 数据库（免费 MySQL）

1. 打开 https://tidbcloud.com ，用 GitHub/Google 账号注册
2. 点击 **Create Cluster** → 选 **Serverless**（免费层，5GB 存储，10亿次读/月）
3. 集群名随便填（如 `campus-express`），区域选就近的（如 `Singapore`）
4. 创建后，在集群详情页点 **Connect** → 选择 **Prisma** 或 **MySQL CLI** 标签
5. 复制连接字符串，格式类似：
   ```
   mysql://2pDxxxxxxx:xxxxxxx@gatewayxxxxx.prod.aws.tidbcloud.com:4000/campus_express?sslaccept=strict
   ```
6. 在 TiDB 控制台的 **SQL Editor** 里执行建库：
   ```sql
   CREATE DATABASE IF NOT EXISTS campus_express;
   ```
7. 把连接字符串里的数据库名确认是 `campus_express`，保存好，后面要用。

> ⚠️ 连接串必须带 `sslaccept=strict`，TiDB Serverless 强制 SSL。
> ✅ Prisma 用 mysql provider 可直接连 TiDB，无需改 schema。

---

## 第二步：部署后端到 Render

1. 打开 https://render.com ，用 GitHub 注册
2. 右上角 **New +** → **Web Service**
3. 选择 **Build and deploy from a Git repository**
   - 先把代码推到 GitHub（推荐，方便后续更新）
   - 或选 **Public Git repository** 填仓库地址
4. 配置项：

   | 字段 | 值 |
   |---|---|
   | Name | `campus-express`（会成为子域名） |
   | Region | 选 Singapore（离国内近，且和 TiDB 同区域延迟低） |
   | Branch | `main` 或 `master` |
   | Root Directory | `server` |
   | Runtime | `Node` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `node src/app.js` |
   | Instance Type | **Free**（免费） |

   > ✅ Node 版本已在 package.json 的 engines 字段指定为 >=18，Render 会自动用兼容版本。

5. 点击 **Advanced** → **Add Environment Variable**，逐个添加：

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | 第一步 TiDB 的完整连接串（含 sslaccept=strict） |
   | `JWT_SECRET` | 复制你本地 `.env` 里的那串（保持一致，否则已登录用户 token 失效） |
   | `WECHAT_APPID` | `wx4f09c93b9f03d739` |
   | `WECHAT_SECRET` | 复制你本地 `.env` 里的值 |
   | `ADMIN_PASSWORD` | 复制你本地 `.env` 里的值 |

   > ⚠️ **不要加 PORT 变量**，Render 会自动注入，代码里 `process.env.PORT` 能直接读到。

6. 点 **Create Web Service**，等待部署完成（约 3-5 分钟）
7. 部署成功后，顶部会显示你的域名，如 `https://campus-express.onrender.com`

---

## 第三步：初始化数据库表

Render 部署完成后，需要在 TiDB 里创建表结构并导入默认配置。

在 Render 后台 → 你的服务 → **Shell** 标签，依次执行：
```bash
npx prisma db push
node prisma/seed.js
```

看到 `Seed completed successfully.` 就成功了。

> ✅ seed.js 会导入默认驿站（校内驿站、校外驿站）和 16 栋楼栋配置。

---

## 第四步：验证后端是否跑通

浏览器访问：
- `https://你的域名.onrender.com/config` → 应返回 JSON，包含 stations 和 buildings

> 💡 Render 免费层 15 分钟无请求会休眠，第一次访问可能慢（冷启动约 30 秒），之后就快了。可用 UptimeRobot 每 5 分钟 ping 一次防止休眠（见第七步）。

---

## 第五步：小程序配置 API 地址

### 5.1 修改代码里的 API 地址

编辑 `miniprogram/src/config.ts`：
```ts
export const API_BASE_URL = 'https://你的域名.onrender.com'
```

重新编译：
```bash
cd miniprogram
npx taro build --type weapp
```

### 5.2 微信小程序后台配置合法域名

1. 登录 https://mp.weixin.qq.com
2. **开发管理** → **开发设置** → **服务器域名**
3. **request 合法域名** 添加：`https://你的域名.onrender.com`
4. **uploadFile 合法域名** 也添加同一个（头像上传用）

> ✅ 微信小程序只要求 HTTPS，不要求域名备案。Render 自带证书，直接填就行。
> ⚠️ 域名不能带端口号，不能是 IP，不能是 localhost。

---

## 第六步：管理后台部署（可选，Vercel 免费）

`admin/` 是纯前端 Vue3 项目，代码里用 `/api` 相对路径，已配置好 `vercel.json` 自动转发到后端。

1. 先编辑 `admin/vercel.json`，把里面的 `https://campus-express.onrender.com` 改成**你实际的后端域名**
2. 打开 https://vercel.com ，用 GitHub 注册
3. **Add New** → **Project** → 导入你的仓库
4. 配置：
   - Root Directory：`admin`
   - Framework Preset：**Vite**
   - Build Command：`npm run build`（自动识别）
   - Output Directory：`dist`（自动识别）
5. 不需要加环境变量，直接 Deploy
6. 部署后得到 `https://xxx.vercel.app`，访问即可登录管理后台

> ✅ 已通过 vercel.json 配置 rewrites，所有 `/api/*` 请求会自动转发到你的 Render 后端，代码无需修改。
> 默认管理员密码：你在 Render 环境变量里设的 `ADMIN_PASSWORD`。

---

## 第七步：防止 Render 休眠（推荐，免费）

Render 免费层 15 分钟无请求会休眠，用 UptimeRobot 免费保活：

1. 打开 https://uptimerobot.com 注册（免费）
2. **Add New Monitor**
   - Monitor Type：`HTTP(s)`
   - Friendly Name：`campus-express 保活`
   - URL：`https://你的域名.onrender.com/config`
   - Monitoring Interval：`5 minutes`
3. 保存即可

**效果**：永远不会休眠，还能监控服务状态，挂了会发邮件提醒。

---

## 常见问题

### Q: Prisma 连 TiDB 报错？
A: 确认连接串末尾带了 `sslaccept=strict`，TiDB Serverless 必须 SSL。

### Q: Render 构建失败？
A: 看日志，常见原因：
- 代码没推到 GitHub（Render 拉不到）
- package.json 里的 build 脚本缺失（已帮你加好）
- Node 版本过低（已通过 engines 指定 >=18）

### Q: 小程序请求失败？
A: 检查：
- 域名是否配到了小程序后台的 request 合法域名
- 域名是否是 HTTPS（Render 自带）
- 后端是否休眠了（第一次访问等 30 秒）
- `config.ts` 里的地址是否正确（不要漏 https://，不要带端口）

### Q: 头像上传后重启就没了？
A: Render 免费层文件系统是临时的，部署/重启会清空。课程演示可接受；后续可迁移到 Cloudflare R2（免费 10GB），需要改上传代码。

### Q: 管理后台登录失败？
A: 检查 `admin/vercel.json` 里的后端地址是否正确，以及 Render 的 `ADMIN_PASSWORD` 环境变量是否设置。

### Q: TiDB Cloud 免费层够用吗？
A: 5GB 存储 + 每月 10 亿次读，校园快递项目完全够用，不会超。

---

## 成本总结

| 项目 | 费用 |
|---|---|
| Render 后端 | 0 元/月 |
| TiDB 数据库 | 0 元/月 |
| 域名（Render 自带） | 0 元 |
| HTTPS 证书（Render 自带） | 0 元 |
| 管理后台（Vercel） | 0 元/月 |
| UptimeRobot 保活 | 0 元/月 |
| **合计** | **0 元** |
