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
- 网页化邮件模板 - React Email 响应式 HTML 邮件
- 主题色定制 - 10 组预设色板 + 自定义 Hue 滑杆，全站品牌色即时切换
- 精致动效 - framer-motion 页面过渡、卡片入场、数字滚动、布局动画
- 多维图表 - 环形图、柱状图、面积图，覆盖流量、告警、短信、报告等场景

## 技术栈

- 框架: Next.js 16 (App Router)
- UI: Base UI + TailwindCSS v4
- 动效: framer-motion
- 数据库: SQLite (`better-sqlite3`, WAL)
- 数据迁移: 内置版本化 Migration (`PRAGMA user_version`)
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
CPE_REQUEST_TIMEOUT_MS=15000
CPE_CONFIG_SECRET=your_long_stable_config_secret
```

### 3. 初始化数据库

项目使用 `data/cpe-monitor.db`。首次启动会自动创建 SQLite 数据库；升级时按 `PRAGMA user_version` 顺序执行幂等 Migration。数据库初始化在每个 Node 进程内只运行一次，不需要执行额外的 ORM 命令。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000，使用配置的密码登录。

`CPE_PASSWORD` 只在服务端读取，不能提交到 Git。成功登录后的 SessionID、请求校验 Token 和 RSA 会话参数会使用 AES-256-GCM 加密后保存到 SQLite，服务重启后优先复用；只有 CPE 明确返回会话失效时才会清除旧会话并重新登录一次。通过设置页面保存的 CPE 密码、SMTP 密码和企业微信 Webhook 同样使用 AES-256-GCM 加密，旧版本留下的明文会在首次服务端读取时自动迁移。设置接口只向浏览器返回“已配置”状态，不会返回现有密钥。`CPE_CONFIG_SECRET` 和 `CPE_SESSION_SECRET` 必须保持稳定，缺省时依次回退到其他 CPE 密钥和 `JWT_SECRET`。所有 CPE HTTP 请求默认 15 秒超时，可通过 `CPE_REQUEST_TIMEOUT_MS` 调整。

### 5. 质量检查

```bash
npm run typecheck
npm run lint
npm test
npm run check
```

测试使用 Node 22 自带的 TypeScript 类型剥离和 `node:test`，不会额外启动数据库服务。核心测试覆盖时区、计数器复位、速率单位、告警目录、通知密钥加密和 Migration 幂等性。

## 主题定制

全站品牌色基于 oklch 色彩空间的 Hue 旋转模型：保持原有亮度/饱和度，仅替换 Hue 即可整体换色，语义色（success/warning/danger）不受影响。

- **预设色板**：青蓝（默认 Hue 201）、靛蓝、紫罗兰、品红、珊瑚、琥珀、翡翠、薄荷、天蓝、玫红
- **自定义 Hue**：0–360° 滑杆实时预览，渐变轨道直观选色
- **持久化**：保存在 localStorage（`cpeye-theme-hue`），无需后端改动，刷新后自动恢复
- **入口**：设置页「主题色」区块，或顶部导航调色板按钮快捷切换
- **图表联动**：Chart.js 组件读取 CSS 变量，切换主题色后图表自动跟随重绘

核心实现：`src/lib/theme-colors.ts`（预设与派生调色板）、`src/hooks/useThemeColor.ts`、`src/components/ThemeColorProvider.tsx`。

## 动效体系

基于 framer-motion 的统一动效层，所有动效均尊重 `prefers-reduced-motion` 设置，自动降级为无动画。

- **动效原语**：`src/components/motion/` 提供 PageTransition、MotionCard、ScrollReveal、AnimatedCounter、StaggerGroup 等可复用组件
- **页面过渡**：AnimatePresence + pathname key，路由切换时淡入淡出
- **逐页动效**：登录页光斑漂浮、仪表盘数字滚动、设备表格行级入场、短信列表布局动画、告警卡片 layout 动画、设置区块 spring 展开
- **导航**：TopNav active 指示器 layoutId 滑动、移动端菜单 spring 展开
- **表单**：统一 focus 态（brand 色边框 + 光环）、按钮 active 缩放、保存成功绿色 check 微反馈、错误提示滑入
- **滚动条**：WebKit + Firefox 细滚动条美化，圆角半透明拇指块

## 图表

基于 Chart.js + react-chartjs-2，通过共享主题层自动响应 dark/light 和自定义 Hue。

- **共享主题**：`src/lib/chart-theme.ts` 提供 `useChartTheme()` hook（监听主题切换 + MutationObserver 响应 Hue 变化）和 tooltip/图例/坐标轴统一配置
- **通用组件**：`src/components/charts/` 包含 DonutChart（环形图 + 中心文字）、BarChart（圆角柱状 + 渐变填充）、AreaChart（渐变面积图）
- **页面覆盖**：仪表盘套餐用量环形图、告警规则分布环形图 + 启用状态柱状图、报告页 14 天流量趋势 + 网络质量评分、短信页 7 日活跃柱状图、设备页信号/设备数历史曲线

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
│   ├── theme-colors.ts      # 主题色预设与 Hue 派生调色板
│   ├── chart-theme.ts       # 图表共享主题与 useChartTheme
│   ├── cpe-client.ts        # 稳定 CPE Facade 与实例管理
│   ├── cpe-client-core.ts   # CPE 会话与端点客户端
│   ├── cpe-http.ts          # 请求超时与传输
│   ├── cpe-crypto.ts        # 登录证明、RSA 与短信解密
│   ├── cpe-protocol.ts      # XML 协议、转义和认证错误识别
│   ├── db.ts                # SQLite 连接与版本化 Migration
│   ├── date-time.ts         # UTC/Asia-Shanghai 时间边界
│   ├── traffic-units.ts     # 流量计数器和速率单位
│   ├── alert-metrics.ts     # 告警指标单一目录
│   ├── notification-config.ts # 通知密钥安全序列化
│   ├── repositories/        # 告警、监控、短信、设置和日报数据访问边界
│   ├── scheduler.ts         # 定时任务
│   ├── report-generator.ts  # 报告生成
│   └── notifiers/           # 通知模块
├── emails/                  # React Email 模板
├── components/              # 共享组件
│   ├── motion/              # framer-motion 动效原语
│   └── charts/              # 通用图表组件 (Donut/Bar/Area)
├── features/                # 告警、日报和设置 feature-local 模块
└── types/                   # API 与 CPE 响应类型
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

### 自托管

```bash
npm run build
npm start
```

该项目依赖持久化 SQLite 文件和后台定时任务，生产环境应使用 Docker、服务器或 NAS，并将 `/app/data` 挂载到持久化卷。无持久化文件系统或会暂停后台进程的 Serverless 平台不适合直接部署此版本。

## License

MIT
