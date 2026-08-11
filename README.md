# 校园快递代拿平台

## 项目结构

```
campus-express/
├── server/          # Koa 后端 API (Node.js + Prisma + MySQL)
├── admin/           # Web 管理后台 (Vue 3 + Element Plus + Vite)
├── miniprogram/     # 微信小程序 (Taro 4 + React)
└── README.md
```

## 环境要求

- Node.js 18+
- MySQL 8.0
- 微信开发者工具
- 微信小程序 AppID + AppSecret

## 快速开始

### 1. 后端 (server/)

```bash
cd server
cp .env.example .env          # 编辑 .env 填写数据库连接等信息
npm install
npx prisma db push            # 创建数据库表
node prisma/seed.js           # 导入默认配置（驿站、楼栋）
npm run dev                   # 启动开发服务器 :3000
```

### 2. 管理后台 (admin/)

```bash
cd admin
npm install
npm run dev                   # 启动 :5173
```

默认管理员密码：`admin123`（可在 server/.env 的 ADMIN_PASSWORD 修改）

### 3. 小程序 (miniprogram/)

```bash
cd miniprogram
npm install --legacy-peer-deps

# 已配置好 AppID，可直接编译
npx taro build --type weapp    # 编译为微信小程序

# 打开微信开发者工具 → 导入项目 → 选择 dist 目录
```

#### 小程序 API 地址配置

开发环境默认连接 `http://localhost:3000`。如需修改：

1. 设置环境变量 `TARO_APP_API_BASE` 为你的服务器地址
2. 或在 `src/utils/api.ts` 中直接修改 `BASE_URL`
3. 在生产环境，需在小程序后台将服务器域名添加到 **request 合法域名**

## .env 配置说明

```env
DATABASE_URL="mysql://root:password@localhost:3306/campus_express"
JWT_SECRET="your-secret-key-change-me"
WECHAT_APPID="你的小程序AppID"
WECHAT_SECRET="你的小程序AppSecret"    # 从微信公众平台获取
ADMIN_PASSWORD="admin123"
```

## API 接口

### 公开接口
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/config` | 获取驿站和楼栋列表（无需登录） |
| POST | `/auth/login` | 小程序登录（code → JWT） |
| POST | `/auth/admin-login` | 管理后台密码登录 |

### 用户接口（需登录）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/user/profile` | 获取个人信息 |
| PUT | `/user/profile` | 更新手机号 |
| POST | `/orders` | 创建订单 |
| GET | `/orders/mine` | 我的订单 |
| GET | `/orders/:id` | 订单详情 |
| POST | `/orders/:id/confirm` | 确认收货 |

### 配送员/管理员接口（需 role >= 1）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/manage/today` | 今日订单（按楼栋分组） |
| POST | `/manage/:id/verify` | 核验订单 |
| POST | `/manage/:id/pick` | 标记取件 |
| POST | `/manage/:id/deliver` | 标记送达 |
| POST | `/manage/batch-pick` | 批量取件 |
| POST | `/manage/batch-deliver` | 批量送达 |
| POST | `/manage/:id/cancel` | 取消订单 |

### 管理员接口（需 role = 2）
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/admin/config` | 获取配置 |
| PUT | `/admin/config/stations` | 更新驿站列表 |
| PUT | `/admin/config/buildings` | 更新楼栋列表 |
| GET | `/admin/members` | 成员列表 |
| POST | `/admin/members` | 添加成员 |
| DELETE | `/admin/members/:id` | 移除成员 |
| GET | `/admin/stats` | 今日统计 |

## 订单状态

| 状态码 | 含义 |
|---|---|
| 0 | 已提交（待取件） |
| 1 | 已取件（配送中） |
| 2 | 已送达（待确认） |
| 3 | 已确认（完成） |

## 技术栈

| 层 | 技术 |
|------|------|
| 小程序 | Taro 4 + React + TypeScript |
| 后端 | Koa 2 + Prisma + MySQL |
| 管理后台 | Vue 3 + Vite + Element Plus |
| 支付 | 微信小商店（独立收款，平台不接入） |
