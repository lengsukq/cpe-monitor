# CPE Monitor - 流量监控预警系统

H153 CPE 流量监控、告警通知、每日报告系统。

## 功能特性

- 流量实时监控 - 仪表盘展示当前流量、设备数量、信号强度
- 流量趋势图表 - Chart.js 折线图，支持 1h/6h/24h/7d 时间范围
- 定时任务控制 - 可开关定时采集，支持 5/15/30/60 分钟间隔
- 告警规则管理 - 支持流量、设备数量、信号强度等多种告警条件
- 邮件通知 - SMTP 配置，支持多收件人
- 企业微信通知 - Webhook 推送
- 每日报告 - 自动生成流量日报，包含设备排名、网络质量评估
- 优美邮件模板 - React Email + TailwindCSS 响应式设计

## 技术栈

- 框架: Next.js 15 (App Router)
- UI: HeroUI v3 + TailwindCSS v4
- 数据库: Neon PostgreSQL (serverless)
- ORM: Drizzle ORM
- 认证: JWT (jose) + bcryptjs
- 图表: Chart.js + react-chartjs-2
- 定时任务: node-cron
- 邮件: nodemailer + React Email

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env.local`，填写配置:

```env
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/cpe_monitor?sslmode=require
CPE_DEFAULT_URL=http://192.168.31.1
```

### 3. 初始化数据库

访问 Neon 控制台创建数据库，然后运行:

```bash
npm run db:push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000，使用配置的密码登录。

## 项目结构

```
src/
├── app/
│   ├── (authenticated)/     # 需要认证的页面
│   │   ├── dashboard/       # 仪表盘
│   │   ├── settings/        # 设置
│   │   ├── alerts/          # 告警规则
│   │   └── reports/         # 每日报告
│   ├── api/                 # API 路由
│   └── login/               # 登录页
├── lib/
│   ├── auth.ts              # JWT 认证
│   ├── cpe-client.ts        # CPE 客户端
│   ├── db.ts                # 数据库连接
│   ├── schema.ts            # 数据库 Schema
│   ├── scheduler.ts         # 定时任务
│   ├── report-generator.ts  # 报告生成
│   └── notifiers/           # 通知模块
├── emails/                  # React Email 模板
└── components/              # 组件
```

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 仪表盘
- `GET /api/dashboard/overview` - 概览数据
- `GET /api/dashboard/traffic?range=24h` - 流量历史
- `POST /api/dashboard/scheduler` - 调度控制

### 设置
- `GET/POST /api/settings/cpe` - CPE 配置
- `GET/POST /api/settings/notification` - 通知配置
- `POST /api/settings/password` - 修改密码

### 告警
- `GET/POST/PUT/DELETE /api/alerts/rules` - 告警规则
- `GET /api/alerts/logs` - 告警日志

### 报告
- `GET /api/reports/daily` - 报告列表
- `POST /api/reports/daily` - 生成预览

## 部署

### Vercel

1. Fork 本仓库
2. 在 Vercel 创建项目
3. 配置环境变量
4. 部署

### 自托管

```bash
npm run build
npm start
```

## License

MIT
