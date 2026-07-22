# CPE Monitor - 流量监控预警系统

H153 CPE 流量监控、告警通知、每日报告系统。

## 功能特性

- 流量实时监控 - 仪表盘展示当前流量、设备数量、信号强度
- 流量趋势图表 - Chart.js 折线图，支持 1h/6h/24h/7d 时间范围
- 定时任务控制 - 可开关定时采集，支持 5/15/30/60 分钟间隔
- 告警规则管理 - 支持流量、设备数量、信号强度等多种告警条件
- 邮件通知 - SMTP 配置，支持多收件人
- 企业微信通知 - Webhook 推送
- 短信收件箱 - 读取 CPE 本地短信，展示未读状态和会话内容
- 新短信同步 - 短信持久化到本地 SQLite，默认每 15 分钟独立同步一次；支持 1–1440 分钟自定义间隔和手动同步
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
CPE_DEFAULT_URL=http://192.168.31.1
CPE_USERNAME=admin
CPE_PASSWORD=your_cpe_password
CPE_SESSION_SECRET=your_long_stable_session_secret
CPE_SESSION_MAX_IDLE_HOURS=24
CPE_CONFIG_SECRET=your_long_stable_config_secret
```

### 3. 初始化数据库

项目使用 `data/cpe-monitor.db`。首次启动会自动创建 SQLite 数据库；升级时也会幂等补充新增字段和索引，无需手动执行迁移命令。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000，使用配置的密码登录。

`CPE_PASSWORD` 只在服务端读取，不能提交到 Git。成功登录后的 SessionID、请求校验 Token 和 RSA 会话参数会使用 AES-256-GCM 加密后保存到 SQLite，服务重启后优先复用；只有 CPE 明确返回会话失效时才会清除旧会话并重新登录一次。通过设置页面保存的 CPE 密码同样使用 AES-256-GCM 加密，旧版本留下的明文会在首次使用时自动迁移。`CPE_CONFIG_SECRET` 和 `CPE_SESSION_SECRET` 必须保持稳定，缺省时依次回退到其他 CPE 密钥和 `JWT_SECRET`。

流量与设备历史默认保留 90 天，采集运行记录默认保留 180 天。可在「系统设置 → 数据保留」修改，并选择立即清理；正常采集后最多每 12 小时自动清理一次过期记录。

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

### H153-381 CPE 实际接口映射

- `/api/monitoring/status` - 连接状态和设备在线统计
- `/api/monitoring/traffic-statistics` - 当前连接流量、累计流量、实时速率
- `/api/monitoring/month_statistics` - 月度套餐流量和本月清零时间
- `/api/net/current-plmn` - 运营商和 PLMN
- `/api/net/cell-info` - 小区 ID、TAC
- `/api/device/signal` - PCI、频段、NRARFCN、RSRP、RSRQ、SINR
- `/api/system/HostInfo` - 终端列表；`Active` 表示当前在线
- `/api/sms/sms-count` - 短信统计
- `/api/sms/sms-list-contact`、`/api/sms/sms-list-phone` - 加密短信会话读取接口

### 设置
- `GET/POST /api/settings/cpe` - CPE 配置
- `GET/POST /api/settings/notification` - 通知配置
- `POST /api/settings/password` - 修改密码

### 告警
- `GET/POST/PUT/DELETE /api/alerts/rules` - 告警规则
- `GET /api/alerts/logs` - 告警日志

### 短信
- `GET /api/dashboard/sms` - 查看本地持久化短信（只读）
- `POST /api/dashboard/sms/sync` - 立即从 CPE 同步短信
- `GET/POST /api/dashboard/sms/settings` - 查看或修改短信自动同步设置

短信同步独立于流量监控任务，默认开启并每 15 分钟运行一次；设置页可调整为 1–1440 分钟的整数间隔或暂停。首次同步只建立本地快照，不会把历史短信批量推送出去；之后发现新的收件短信时，只有已启用且配置完整的邮箱或企业微信通知渠道会收到通知。

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
