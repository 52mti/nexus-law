# Nexus Law - 项目架构与开发规范文档

## 项目概述

Nexus Law 是一个法律AI智能问答平台，提供法律问题智能问答、案例检索、合规审查、文档生成等功能。项目采用前后端分离架构，前端使用 React + Vite + Ant Design，后端使用 NestJS + Prisma + PostgreSQL。

## 目录结构

```
nexus-law/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                # API 接口定义
│   │   ├── assets/             # 静态资源
│   │   ├── components/         # 公共组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── layouts/            # 布局组件
│   │   ├── pages/              # 页面组件
│   │   ├── store/              # 状态管理 (Zustand)
│   │   ├── utils/              # 工具函数
│   │   ├── App.tsx             # 应用入口
│   │   ├── index.css           # 全局样式
│   │   └── main.tsx            # 主入口文件
│   ├── package.json
│   ├── vite.config.ts          # Vite 配置
│   └── tailwind.config.js      # Tailwind CSS 配置
│
├── backend/                    # 后端项目
│   ├── src/
│   │   ├── auth/               # 认证模块
│   │   ├── chat/               # 聊天模块
│   │   ├── common/             # 公共模块
│   │   ├── document/           # 文档模块
│   │   ├── openai/             # OpenAI 集成
│   │   ├── prisma/             # Prisma 配置
│   │   ├── app.module.ts       # 主模块
│   │   └── main.ts             # 入口文件
│   ├── prisma/
│   │   └── schema.prisma       # 数据库模型定义
│   └── package.json
│
└── .clinerules                 # 项目规范指南
```

## 技术栈

### 前端技术栈
- **框架**: React 19.2.0 + TypeScript
- **构建工具**: Vite 7.3.1
- **UI 组件库**: Ant Design 6.3.1
- **样式方案**: Tailwind CSS 4.2.1 + CSS 变量
- **路由**: React Router DOM 7.13.1
- **状态管理**: Zustand 5.0.12
- **HTTP 客户端**: Axios 1.13.6
- **国际化**: i18next 25.8.13 + react-i18next 16.5.4
- **Markdown 渲染**: react-markdown 10.1.0
- **二维码生成**: qrcode.react 4.0.0
- **代码规范**: ESLint 9.39.1 + TypeScript ESLint

### 后端技术栈
- **框架**: NestJS 11.0.1 + TypeScript
- **数据库**: PostgreSQL + Prisma ORM 7.5.0
- **认证**: JWT + bcryptjs 3.0.3
- **AI 集成**: OpenAI SDK 6.29.0
- **数据验证**: class-validator 0.14.1 + class-transformer 0.5.1
- **配置管理**: @nestjs/config 4.0.3
- **代码规范**: ESLint 9.18.0 + Prettier 3.4.2
- **测试**: Jest 30.0.0 + Supertest 7.0.0

## 数据库设计

### 核心实体

```prisma
// 用户表
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  phone     String   @unique
  password  String
  points    Int      @default(0)
  avatarUrl String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 手机验证码表
model VerificationCode {
  id        Int      @id @default(autoincrement())
  phone     String
  code      String
  expiresAt DateTime
  used      Boolean  @default(false)
  
  createdAt DateTime @default(now())
}
```

## 核心架构铁律

### 1. 前后端分离
- 前端在 `frontend/` 目录，后端在 `backend/` 目录，严格分离
- 前端通过统一的 `request.ts` 发起 HTTP 请求
- 后端提供 RESTful API，HTTP 状态码固定为 200

### 2. 响应格式规范
```typescript
// 后端响应格式
interface ApiResponse<T = any> {
  code: number;      // 业务状态码
  message: string;   // 业务消息
  data?: T;          // 业务数据
}

// 业务状态码定义
enum ErrorCode {
  SUCCESS = 0,                    // 成功
  INVALID_EMAIL = 1001,           // 邮箱格式错误
  EMAIL_ALREADY_REGISTERED = 2001, // 邮箱已注册
  USER_NOT_FOUND = 2003,          // 用户不存在
  INTERNAL_SERVER_ERROR = 5000,   // 服务器内部错误
}
```

### 3. 网络层规范
- 前端统一使用 `frontend/src/utils/request.ts` 发起请求
- 禁止在组件中直接引入原生 axios
- 请求拦截器自动添加 Token 认证
- 响应拦截器统一处理错误和业务状态码

### 4. 样式与弹窗规范
- 使用 CSS 变量定义主题色：`--brand-primary: #666cff`
- 页面级别的业务报错（如邮箱已注册），禁止使用全局飘窗（message.error）
- 错误必须高亮在对应的输入框下方
- 使用 Tailwind CSS 的 `primary` 类替代硬编码的颜色值

### 5. 状态管理规范
- 使用 Zustand 进行状态管理
- 用户状态存储在 `useUserStore` 中
- 状态持久化使用 `persist` 中间件
- 开发工具使用 `devtools` 中间件

## 模块设计

### 认证模块 (Auth)
- **功能**: 用户注册、登录、密码重置、手机验证
- **前端**: `frontend/src/pages/Auth/` 包含登录、注册、重置密码表单
- **后端**: `backend/src/auth/` 包含控制器、服务、DTO、实体
- **流程**: 手机号验证 → 密码设置 → JWT Token 生成

### AI 聊天模块 (Chat)
- **功能**: 法律问题智能问答
- **前端**: `frontend/src/pages/AIChatPage.tsx`
- **后端**: `backend/src/chat/` + `backend/src/openai/`
- **集成**: OpenAI GPT 模型，支持上下文对话

### 文档模块 (Document)
- **功能**: 法律文档生成与处理
- **前端**: `frontend/src/pages/DocPage.tsx`
- **后端**: `backend/src/document/`
- **特性**: Markdown 渲染、文档模板、合规检查

### 搜索模块
- **法律搜索**: `frontend/src/pages/LegalSearchPage.tsx`
- **案例搜索**: `frontend/src/pages/CaseSearchPage.tsx`
- **合规审查**: `frontend/src/pages/CompliancePage.tsx`
- **案例审阅**: `frontend/src/pages/CaseReviewPage.tsx`

### 用户中心模块
- **账户信息**: `frontend/src/pages/Account/AccountInfoPage.tsx`
- **订单管理**: `frontend/src/pages/OrderList/OrderListPage.tsx`
- **积分记录**: `frontend/src/pages/PointsRecordPage.tsx`
- **会员管理**: `frontend/src/pages/MembershipPage.tsx`
- **历史记录**: `frontend/src/pages/HistoryPage.tsx`

## 开发规范

### 代码风格
- **TypeScript**: 严格类型检查，避免使用 `any`
- **ESLint**: 使用项目配置的规则
- **Prettier**: 代码自动格式化
- **命名规范**: 
  - 组件使用 PascalCase: `UserProfile.tsx`
  - 函数使用 camelCase: `getUserInfo()`
  - 常量使用 UPPER_SNAKE_CASE: `API_BASE_URL`
  - 接口使用 PascalCase: `IUserProfile`

### 组件设计
- **功能单一**: 每个组件只负责一个功能
- **Props 类型**: 明确定义 Props 接口
- **状态管理**: 复杂状态使用 Zustand，简单状态使用 useState
- **性能优化**: 使用 React.memo、useCallback、useMemo 优化性能
- **懒加载**: 页面级组件使用 React.lazy 进行代码分割

### API 设计
- **RESTful**: 遵循 RESTful 设计原则
- **版本控制**: API 路径包含版本号 `/api/v1/`
- **错误处理**: 统一错误响应格式
- **文档**: 使用 Swagger/OpenAPI 文档

### 安全规范
- **密码加密**: 使用 bcryptjs 进行密码哈希
- **JWT 认证**: 使用 Bearer Token 进行身份验证
- **输入验证**: 前后端双重验证
- **SQL 注入防护**: 使用 Prisma ORM 防止 SQL 注入
- **CORS 配置**: 严格配置跨域资源共享

## 部署与运维

### 环境变量
```bash
# 前端环境变量 (.env)
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_TITLE=Nexus Law

# 后端环境变量 (.env)
DATABASE_URL=postgresql://user:password@localhost:5432/nexus_law
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

### 构建与部署
```bash
# 前端构建
cd frontend
npm run build

# 后端构建
cd backend
npm run build
npm run start:prod

# 数据库迁移
npx prisma migrate deploy
npx prisma generate
```

### 监控与日志
- **错误监控**: 集成 Sentry 或类似服务
- **性能监控**: 使用 Application Performance Monitoring (APM)
- **日志管理**: 结构化日志，区分开发和生产环境
- **健康检查**: `/health` 端点用于健康检查

## 扩展与维护

### 添加新功能
1. 在前端 `pages/` 目录创建新页面
2. 在后端创建对应的模块（控制器、服务、DTO）
3. 更新数据库 schema（如果需要）
4. 添加路由配置
5. 编写单元测试和集成测试

### 代码审查
- **PR 模板**: 使用标准的 Pull Request 模板
- **代码审查**: 至少需要一名 reviewer 批准
- **自动化测试**: CI/CD 流水线必须通过所有测试
- **代码覆盖率**: 保持 80% 以上的测试覆盖率

### 文档维护
- **API 文档**: 使用 Swagger 自动生成
- **组件文档**: 使用 Storybook 或类似工具
- **架构文档**: 及时更新本架构文档
- **部署文档**: 详细记录部署步骤和故障排除

---

*最后更新: 2026年3月23日*
*版本: 1.0.0*