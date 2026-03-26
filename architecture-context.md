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

### 2. 后端模块架构
```
ConfigModule (全局配置)
    ↓
PrismaModule (全局数据库)
    ↓
OpenaiModule (全局AI服务，@Global() 装饰器)
    ↓
业务模块层 (共7个):
├─ AuthModule           (用户认证 & 授权)
├─ ChatModule           (AI 聊天，流式响应)
├─ DocumentModule       (法律文档生成)
├─ LegalSearchModule    (法律条文搜索，Temperature=0.1 保证准确性)
├─ CaseSearchModule     (案例趋势分析，Temperature=0.3)
├─ CaseSummaryModule    (案例总结，Temperature=0.3)
└─ ComplianceModule     (合规风险审查，Temperature=0.2)
```

### 3. 响应格式规范
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

// AI 模块统一使用 Strategy Pattern
// 每个业务模块自定义 SystemPrompt，通过 OpenaiService 执行
```

### 4. 网络层规范
- 前端统一使用 `frontend/src/utils/request.ts` 发起请求
- 禁止在组件中直接引入原生 axios
- 请求拦截器自动添加 Token 认证 (JWT)
- 响应拦截器统一处理错误和业务状态码
- API 路由约定：`/api/v1/{module}/{endpoint}`

### 5. 样式与弹窗规范
- 使用 CSS 变量定义主题色：`--brand-primary: #666cff`
- 页面级别的业务报错（如邮箱已注册），禁止使用全局飘窗（message.error）
- 错误必须高亮在对应的输入框下方
- 使用 Tailwind CSS 的 `primary` 类替代硬编码的颜色值
- Ant Design 主题通过 ConfigProvider 全局配置

### 6. 状态管理规范
- 使用 Zustand 进行状态管理
- 用户状态存储在 `useUserStore` 中
- 状态持久化使用 `persist` 中间件
- 开发工具使用 `devtools` 中间件
- 避免过度使用全局状态，仅存储跨页面共享的数据

## 后端架构详解

### 依赖注入与模块加载顺序
1. **App.Module** 启动时加载所有模块
2. **全局模块**（@Global）被注入到所有其他模块：
   - ConfigModule: 环境变量管理
   - PrismaModule: 数据库连接池
   - OpenaiModule: AI 服务（所有业务模块依赖）
3. **业务模块**：完全独立的特性模块，共享全局模块

### AI 集成架构 (Strategy Pattern)
```typescript
// OpenaiService 作为统一 AI 入口
OpenaiService
├─ 流式聊天 (ChatModule 使用)
├─ 文档生成 (DocumentModule 使用)
├─ 搜索分析 (LegalSearch/CaseSearch 使用)
├─ 合规审查 (ComplianceModule 使用)
└─ 情感分析 (CaseSummary 使用)

// 每个业务模块定义自己的 SystemPrompt，调用 OpenaiService
// 通过 Temperature 参数控制创意度：
//   - 0.1 (法律搜索) → 精准合规
//   - 0.2 (合规审查) → 保守风险评估
//   - 0.3 (案例分析) → 平衡分析
```

### 全局异常处理与管道
```typescript
// main.ts 配置
ValidationPipe()          // DTO 数据验证
BusinessExceptionFilter() // 统一异常响应

// 所有异常都转换为标准 ApiResponse 格式
```

## 前端架构详解

### 路由结构与代码分割
```
/login
  └─ AuthPage (认证模块)

/ (MainLayout - 不lazy-load，保证持久状态)
  ├─ /chat/:id?          (AI聊天 - React.lazy)
  ├─ /doc/:id?           (文档生成 - React.lazy)
  ├─ /law                (法律搜索 - React.lazy)
  ├─ /case_search        (案例搜索 - React.lazy)
  ├─ /case_review        (案例总结 - React.lazy)
  ├─ /compliance         (合规审查 - React.lazy)
  ├─ /history            (聊天历史 - React.lazy)
  ├─ /account            (账户信息 - React.lazy)
  ├─ /vip                (会员管理 - React.lazy)
  ├─ /orders             (订单列表 - React.lazy)
  └─ /points             (积分记录 - React.lazy)
```

### 性能优化策略
- **代码分割**：路由级别的 React.lazy() 实现按需加载
- **持久窗口**：MainLayout 不卸载，减少重排
- **状态管理**：Zustand 相对于 Redux 更轻量级
- **样式系统**：CSS 变量 + Tailwind，避免 runtime 计算

## 核心模块详解

### AuthModule (认证模块)
**职责**：用户认证、授权、会话管理
- **前端**：`frontend/src/pages/Auth/` - Login, Register, ResetPassword 表单
- **后端**：`backend/src/auth/`
  - `auth.controller.ts` - 路由处理
  - `auth.service.ts` - JWT 签发、密码加密 (bcryptjs)
  - `dto/` - 请求/响应数据结构
  - `entities/` - JWT Payload 定义
- **流程**：
  1. 用户提交邮箱/电话
  2. 后端发送验证码 (VerificationCode)
  3. 用户验证码 + 密码
  4. 后端返回 JWT Token
  5. 前端存储 Token，后续请求自动添加 Authorization 头
- **依赖**：bcryptjs, JWT, Prisma

### ChatModule (AI聊天模块)
**职责**：实时 AI 法律问答，支持流式响应
- **前端**：`frontend/src/pages/AIChatPage.tsx`
  - 消息列表展示
  - 流式文本渲染 (SSE)
  - 对话上下文保存
- **后端**：`backend/src/chat/`
  - 调用 OpenaiService
  - SSE(Server-Sent Events) 流式传输
  - SystemPrompt: 法律专家身份
- **关键特性**：
  - 上下文对话（维护聊天历史）
  - 流式输出（用户实时看到文本生成）
  - Token 限制处理
- **依赖**：OpenaiService, RxJS Observables

### DocumentModule (文档生成模块)
**职责**：AI 生成法律文档（合同、诉讼文书等）
- **前端**：`frontend/src/pages/DocPage.tsx`
  - 模板选择
  - 参数填写表单
  - Markdown 渲染最终文档
- **后端**：`backend/src/document/`
  - 支持多种文档类型模板
  - OpenAI 批量生成或交互式生成
  - 文档版本管理
- **支持的文档**：合同、诉状、答辩状、调解协议等
- **依赖**：OpenaiService, Prisma, react-markdown

### LegalSearchModule (法律条文搜索)
**职责**：搜索法律条文，提供 AI 解读
- **前端**：`frontend/src/pages/LegalSearchPage.tsx`
  - 关键词搜索
  - 条文详情展示
  - AI 解读对话
- **后端**：`backend/src/legal-search/`
  - 向量搜索或模糊匹配条文库
  - OpenaiService (Temperature=0.1 保证精度)
  - 返回相关条文 + AI 解释
- **特点**：
  - Temperature 设为 0.1（保证准确性，减少幻觉）
  - 强制引用条文编号
  - 拒绝不确定的回答
- **依赖**：OpenaiService, Prisma

### CaseSearchModule (案例研究分析)
**职责**：分析案例趋势、判例分析
- **前端**：`frontend/src/pages/CaseSearchPage.tsx`
- **后端**：`backend/src/case-search/`
  - OpenaiService (Temperature=0.3 允许合理推理)
  - 案例库检索
  - 趋势分析
- **输出**：判例分析、风险评估、诉讼策略建议
- **依赖**：OpenaiService, 案例数据库

### CaseSummaryModule (案例总结)
**职责**：快速总结案例要点、争议焦点、裁判理由
- **前端**：`frontend/src/pages/CaseReviewPage.tsx`
- **后端**：`backend/src/case-summary/`
  - 接收案例文本或 ID
  - OpenaiService (Temperature=0.3)
  - 生成结构化总结
- **输出格式**：基本信息、案件事实、法律问题、裁判理由、判决结果
- **依赖**：OpenaiService

### ComplianceModule (合规审查)
**职责**：文件合规性检查、风险识别
- **前端**：`frontend/src/pages/CompliancePage.tsx`
  - 上传文件或输入文本
  - 合规检查结果展示
  - 风险标记与建议
- **后端**：`backend/src/compliance/`
  - 文件解析
  - OpenaiService (Temperature=0.2 保守风险评估)
  - 返回危险项目清单与修改建议
- **检查项**：法律条款合规性、隐私条款、免责声明、强制性条款遗漏等
- **依赖**：OpenaiService, 可选：PDF/Word 解析库

### 用户中心模块
- **账户信息**: `frontend/src/pages/Account/AccountInfoPage.tsx` - 编辑用户资料、头像、密码
- **订单管理**: `frontend/src/pages/OrderList/OrderListPage.tsx` - 查看订单与交易历史
- **积分记录**: `frontend/src/pages/PointsRecordPage.tsx` - 积分明细与兑换记录
- **会员管理**: `frontend/src/pages/MembershipPage.tsx` - VIP 等级与权益说明
- **历史记录**: `frontend/src/pages/HistoryPage.tsx` - 聊天对话历史查看

## 数据库设计（Prisma Schema）

### 核心表结构

**User 表** - 用户基本信息
```prisma
model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  phone      String   @unique
  password   String   // bcryptjs 加密 hash
  points     Int      @default(0) // 用户积分
  avatarUrl  String?  // 头像 URL
  
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  // 关系
  chats       Chat[]
  documents   Document[]
  orders      Order[]
  searchHistory SearchHistory[]
}
```

**VerificationCode 表** - 短信或邮件验证码
```prisma
model VerificationCode {
  id        Int      @id @default(autoincrement())
  phone     String
  code      String   // 6 位验证码
  expiresAt DateTime // 过期时间
  used      Boolean  @default(false) // 是否已使用
  
  createdAt DateTime @default(now())
  
  @@unique([phone, code])
}
```

**Chat 表** - 聊天会话
```prisma
model Chat {
  id        Int           @id @default(autoincrement())
  userId    Int
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title     String        // 对话标题（可自动生成）
  messages  ChatMessage[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ChatMessage {
  id      Int     @id @default(autoincrement())
  chatId  Int
  chat    Chat    @relation(fields: [chatId], references: [id], onDelete: Cascade)
  
  role    String  // "user" | "assistant"
  content String  @db.Text
  tokens  Int?    // 此消息的 token 数
  
  createdAt DateTime @default(now())
}
```

**Document 表** - 生成的法律文档
```prisma
model Document {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      String  // "合同", "诉状", "答辩状", "调解协议" 等
  title     String
  content   String  @db.Text // Markdown 格式
  version   Int     @default(1) // 版本号
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Order 表** - 订单（会员、文档包等）
```prisma
model Order {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      String   // "vip_month", "doc_pack_10", "points_100" 等
  amount    Float
  description String // 订单描述
  status    String   // "pending", "paid", "completed", "canceled"
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**SearchHistory 表** - 搜索历史
```prisma
model SearchHistory {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  type      String  // "legal", "case", "compliance"
  query     String
  results   String? @db.Text // 搜索结果摘要
  
  createdAt DateTime @default(now())
}
```

## 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      客户端 (Browser)                           │
├─────────────────────────────────────────────────────────────────┤
│  React App (Vite)                                               │
│  ├─ Router (React Router)                                       │
│  ├─ State (Zustand)                                             │
│  ├─ Components (Ant Design + Tailwind)                          │
│  └─ API Layer (axios via request.ts)                            │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTP(S)
               ↓
┌──────────────────────────────────────────────────────────────────┐
│             后端 API (NestJS on Node.js)                        │
├──────────────────────────────────────────────────────────────────┤
│  AppModule                                                        │
│  ├─ [Global] ConfigModule → 环境变量                            │
│  ├─ [Global] PrismaModule → PostgreSQL                          │
│  ├─ [Global] OpenaiModule → 大语言模型                          │
│  │                                                               │
│  └─ Business Modules (7个)                                      │
│     ├─ AuthModule          → JWT + bcryptjs                    │
│     ├─ ChatModule          → SSE 流式聊天                       │
│     ├─ DocumentModule      → AI 文档生成                        │
│     ├─ LegalSearchModule   → 法律条文搜索                       │
│     ├─ CaseSearchModule    → 案例分析                           │
│     ├─ CaseSummaryModule   → 案例总结                           │
│     └─ ComplianceModule    → 合规检查                           │
└───────┬─────────────────┬──────────────────────────────────────┘
        │                 │
        ↓                 ↓
┌────────────────┐   ┌──────────────────┐
│  PostgreSQL    │   │  OpenAI API      │
│  (Prisma ORM)  │   │  (GPT-4/4 Mini)  │
└────────────────┘   └──────────────────┘
```

## 关键架构特性

### 1. 分层依赖关系
- **全局层**：ConfigModule, PrismaModule, OpenaiModule
- **业务层**：各功能模块共享全局依赖
- **无循环依赖**：单向依赖关系

### 2. AI 集成方式 (Strategy Pattern)
```typescript
每个模块定义业务定制的 SystemPrompt
      ↓
通过 OpenaiService 创建完成请求
      ↓
根据场景设置 Temperature（0.1-0.3）
      ↓
返回结果给前端
```

### 3. 认证流程
```
用户登录页面
      ↓
验证码验证（SMS/邮箱）
      ↓
JWT Token 签发
      ↓
前端存储 Token（localStorage）
      ↓
后续请求自动携带 Authorization 头
      ↓
AuthGuard 中间件校验
```

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

*最后更新: 2026年3月25日*
*版本: 2.0.0*
*更新说明: 重新梳理架构、补充模块详解、优化文档结构*