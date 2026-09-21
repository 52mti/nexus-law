# Nexus Law 管理端（独立 Vite 工程）

基于 [Shadcn Admin](https://github.com/satnaing/shadcn-admin) 的 UI 约定（Shadcn UI + Tailwind + Vite + TanStack Router），对接 FastAPI `/api/v1/admin/*`。

**不得**与 C 端 `frontend/` 混用，也不得引入 Ant Design。

## 开发

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

默认地址：http://127.0.0.1:5174  
开发代理：`/api` → `http://127.0.0.1:8000`

先启动后端（`backend/`，端口 8000），并用种子脚本创建超管：

```bash
cd backend
uv run python scripts/seed_admin.py
```

默认种子账号（可用环境变量覆盖）：手机 `13800000000`，密码 `Admin123!`（`ADMIN_SEED_PHONE` / `ADMIN_SEED_PASSWORD`）。登录页使用手机号或邮箱 + 密码。Token 存在 `localStorage.admin_token`，与 C 端隔离。

## 权限菜单

| 权限点 | 页面 |
|---|---|
| `user:manage` | 用户、角色权限 |
| `prompt:manage` | 提示词 |
| `agent:manage` | Agent |
| `kb:manage` | 知识库 |
| `plan:manage` | 套餐 |
| `order:manage` | 订单 |
| `billing:view` | 消费记录 |
| `audit:view` | 操作日志 |

`super_admin` 在前端视为拥有全部菜单。补单按钮仅超管可见。
