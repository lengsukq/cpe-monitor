## 协议分析报告

### 1. 场景识别
用户正在对**一台华为（或其代工厂卓翼生产的）型号为 H153-381 的 5G CPE 无线宽带设备**的管理后台进行操作。操作场景是**登录后对设备进行常规管理与维护**，包括登录、查看设备信息、检查系统更新和修改登录密码。

### 2. 交互流程概述
完整的交互链路按时间顺序如下：
1.  **认证初始化 (`POST /api/user/challenge_login`)**: 客户端向服务器发送一个包含用户名 `admin` 和客户端 nonce 的挑战请求，以启动认证流程。
2.  **认证完成 (`POST /api/user/authentication_login`)**: 服务器返回迭代次数、盐值和服务器 nonce 后，客户端计算出并发送客户端证明。服务器验证成功后，返回 RSA 公钥的 `rsae`、`rsan` 参数以及签名。
3.  **设备信息获取**: 认证成功后，客户端通过一系列 `GET` 请求（如 `GET /api/system/deviceinfoex`, `GET /api/system/onlinestate` 等）获取设备型号、序列号、软件版本、连接设备列表等基础信息。
4.  **系统更新检查**: 客户端通过 `POST /api/system/onlineupg` 发起一次系统更新检查 (`"action":"check"`）。随后通过轮询 `GET /api/system/onlinestate` 监控更新状态（`UpdateState` 从 17 变为 16）。
5.  **隐私策略与本地化信息**: 客户端多次请求 `GET /api/app/privacypolicy` 和 `POST /api/device/vendorname`，获取中文版隐私策略和厂商名称 (`卓翼`)，可能用于界面展示。
6.  **密码修改 (`POST /api/user/pwd`)**: 用户最后执行了密码修改操作。请求体包含一个 `nonce` 和加密后的密码数据，表明新密码的传输是加密的。
7.  **管理操作收尾**: 密码修改后，客户端继续执行信息查询（如 `GET /api/system/HostInfo` 获取局域网主机信息、`GET /api/system/topology` 获取设备拓扑）和数据刷新（如 `GET /api/system/devcapacity`, `GET /api/wlan/wlandbho`），完成整个会话。

### 3. API 端点清单
| # | 方法 | 路径 | 用途 | 响应格式 |
|---|------|------|------|----------|
| 1 | POST | `/api/user/challenge_login` | 认证质询，发送用户名和初始 nonce | XML |
| 2 | POST | `/api/user/authentication_login` | 认证验证，发送客户端证明 | XML |
| 3 | GET | `/api/system/deviceinfoex` | 获取设备详细硬件和软件信息 | JSON |
| 4 | GET | `/api/app/privacypolicy` | 获取隐私政策和用户协议内容 | JSON |
| 5 | POST | `/api/device/vendorname` | 获取设备厂商本地化名称 | XML |
| 6 | POST | `/api/host/info` | 同步主机时间信息 | XML |
| 7 | GET | `/api/system/onlinestate` | 查询设备（自身或所有）在线及升级状态 | JSON |
| 8 | POST | `/api/system/onlineupg` | 触发系统在线升级检查或操作 | JSON |
| 9 | GET | `/api/system/HostInfo` | 获取当前连接的局域网主机列表及详情 | JSON |
| 10 | POST | `/api/user/pwd` | 修改用户登录密码 | XML |
| 11 | GET | `/api/system/devcapacity` | 获取设备软件能力标识 | JSON |
| 12 | GET | `/api/system/topology` | 获取设备网络拓扑（如主从设备关系） | JSON |
| 13 | GET | `/api/wlan/wlandbho` | 获取 WLAN 双频优选（DBHO）功能状态 | JSON |
| 14 | GET | `/api/lan/portal-settings` | 获取 LAN Portal（可能是认证门户）设置 | (未示出) |
| 15 | GET | `/system/ioc_device_capacity.json` | 获取 IoT 设备厂商标识列表（用于图标识别） | JSON |

### 4. 鉴权机制分析
- **认证方式**: 采用基于**质询-响应**的认证协议，类似于 **SRP (Secure Remote Password)** 或其变种。
- **凭据获取流程**:
    1.  客户端发送用户名 `admin` 和一个随机生成的 `firstnonce`。
    2.  服务器返回 `iterations`（迭代次数）、`salt`（盐值）和拼接后的 `servernonce`（包含客户端 nonce 和服务器补充部分）。
    3.  客户端根据这些参数和用户密码，计算出 `clientproof` 并发送给服务器。
    4.  服务器验证成功，返回用于后续通信加密的 RSA 公钥参数 (`rsae`, `rsan`) 及签名。
- **凭据传递方式**: 初始认证后，后续所有请求通过 HTTP Header 中的 `Cookie: SessionID=...` 来传递会话凭据，维持登录状态。该 `SessionID` 在认证成功后发生了变化（从 `cefa...` 变为 `d417...`），表明新会话的建立。

### 5. 流式通信分析
**未检测到** SSE (Server-Sent Events) 或 WebSocket 等流式通信。所有交互均为标准的 HTTP 请求-响应模式。状态更新（如升级状态）通过客户端轮询 (`GET /api/system/onlinestate`) 实现。

### 6. 存储使用分析
- **Cookie**:
    - `SessionID` 是核心会话标识，在认证流程中被设置并持续用于后续请求鉴权。
- **localStorage**:
    - 新增了 `e` 和 `n` 两个键，其值分别为 RSA 公钥的指数 `rsae` 和模数 `rsan`。这**是用于客户端加密敏感数据（如密码）的关键公钥**。
- **sessionStorage**:
    - 新增了 `lastLoginState`, `lastLoginIp`, `lastLoginTime`，用于记录上次登录的状态、IP 和时间，可能在前端页面用于状态显示或逻辑判断。

### 7. 关键依赖关系
1.  **认证序列依赖**: `challenge_login` 必须在 `authentication_login` 之前成功调用，获取到 `salt`, `iterations`, `servernonce` 后才能计算 `clientproof`。
2.  **功能鉴权依赖**: 所有 `/api/*` 的查询和设置操作（如 `deviceinfoex`, `onlineupg`, `pwd`）都依赖于认证成功后获得的 `SessionID` Cookie。
3.  **密码修改加密依赖**: `POST /api/user/pwd` 请求中密码数据的加密，依赖于在 `POST /api/user/authentication_login` 成功响应中获得并存储在 `localStorage` 中的 RSA 公钥 (`e`, `n`)。
4.  **状态轮询依赖**: 触发升级检查 (`POST /api/system/onlineupg`) 后，需要多次轮询 `GET /api/system/onlinestate` 来跟踪升级流程的状态变化 (`UpdateState`)。

### 8. 复现建议（伪逻辑）
```python
import requests

session = requests.Session()
base_url = "http://192.168.31.1"

# 1. 认证初始化
challenge_resp = session.post(f"{base_url}/api/user/challenge_login", data={
    "username": "admin",
    "firstnonce": "客户端生成随机nonce",
    "mode": "1"
})
# 解析 challenge_resp 中的 iterations, salt, servernonce

# 2. 认证完成
auth_resp = session.post(f"{base_url}/api/user/authentication_login", data={
    "clientproof": "根据密码、salt、iterations、nonce计算得出",
    "finalnonce": servernonce # 来自上一步
})
# 解析 auth_resp，将 rsae, rsan 存入前端 localStorage 以备后用
# 成功后 session 对象会自动带上新的 SessionID Cookie

# 3. 获取设备信息
session.get(f"{base_url}/api/system/deviceinfoex")
session.get(f"{base_url}/api/system/onlinestate?devid=all")

# 4. 检查系统更新
session.post(f"{base_url}/api/system/onlineupg", json={
    "action": "check",
    "data": {"UpdateAction": 1}
})
# 随后轮询 onlinestate 接口检查 UpdateState 变化

# 5. 获取隐私策略与厂商信息
session.get(f"{base_url}/api/app/privacypolicy?lang=zh_cn&country=NONE")
session.post(f"{base_url}/api/device/vendorname", data={"language": "zh_cn"})

# 6. 修改密码 (使用 RSA 公钥加密新密码)
encrypted_password = rsa_encrypt(new_password, n, e) # 使用 localStorage 中的 e, n
session.post(f"{base_url}/api/user/pwd", data={
    "module": "wlan",
    "nonce": "新生成的nonce",
    "hmac_len": "32",
    "pwd": encrypted_password
})

# 7. 刷新/查询其他信息
session.get(f"{base_url}/api/system/HostInfo")
session.get(f"{base_url}/api/system/topology")
```