# Nexus Law - 项目架构详解

## 项目概述

**Nexus Law** 是一个法律AI智能问答平台，通过整合OpenAI API，为用户提供法律咨询、文档生成、案例分析、合规审查等一站式法律服务。采用**前后端分离架构**、服务模块化设计、流式数据处理等现代最佳实践。

---

## 总体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AI Chat    │  │   Doc Gen    │  │Legal Search  │ ...      │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                      HTTP/SSE                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (NestJS + Prisma)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    AppModule                              │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │           Global Modules & Services                │ │  │
│  │  │  • ConfigModule (Environment Variables)            │ │  │
│  │  │  • PrismaModule (Database Connection)             │ │  │
│  │  │  • OpenaiModule (AI Service - Global)             │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │        Feature Modules (Business Logic)            │ │  │
│  │  │  • AuthModule        → User Auth & Registration    │ │  │
│  │  │  • ChatModule        → Streaming AI Chat           │ │  │
│  │  │  • DocumentModule    → Legal Document Generation  │ │  │
│  │  │  • LegalSearchModule → Regulation Search & AI      │ │  │
│  │  │  • CaseSearchModule  → Case Analysis              │ │  │
│  │  │  • CaseSummaryModule → Case Summarization         │ │  │
│  │  │  • ComplianceModule  → Compliance Review          │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                    PostgreSQL + Prisma ORM
                              │
                              ▼
                    ┌──────────────────┐
                    │  PostgreSQL DB   │
                    │  (User, Auth)    │
                    └──────────────────┘
```

---

## 后端架构详解

### 1. **核心层级结构**

#### 1.1 **入口层 (Entry Point)**
- **[backend/src/main.ts](backend/src/main.ts)** - NestJS应用启动入口
  ```typescript
  // 核心启动流程
  1. NestFactory.create(AppModule)     // 创建应用实例
  2. app.useGlobalPipes()               // 激活全局验证管道
  3. app.useGlobalFilters()             // 激活全局异常过滤器
  4. app.enableCors()                   // 开启跨域支持
  5. app.listen(PORT)                   // 监听端口 (默认 3000)
  ```

#### 1.2 **模块层 (AppModule)**
- **[backend/src/app.module.ts](backend/src/app.module.ts)** - 全局模块聚合器
  - 首先加载 `ConfigModule` (环境变量全局注入)
  - 然后导入所有功能模块
  - 作为NestJS的根模块，统一管理依赖和生命周期

---

### 2. **全局模块系统**

#### 2.1 **ConfigModule** - 环境配置
```
作用：全局环境变量管理
配置文件：.env
导入方式：任何Service都可通过 ConfigService 获取环境变量
关键配置：
  - OPENAI_API_KEY       (OpenAI API密钥)
  - OPENAI_BASE_URL      (OpenAI服务地址)
  - DATABASE_URL         (PostgreSQL连接字符串)
  - PORT                 (server监听端口)
```

#### 2.2 **PrismaModule** - 数据库连接管理
```
文件：backend/src/prisma/
作用：封装Prisma ORM，统一数据库访问
核心服务：PrismaService
  - 管理数据库连接生命周期
  - 提供全局ORM实例给所有模块
导出商品：PrismaService (所有需要DB操作的模块都需要注入它)
```

#### 2.3 **OpenaiModule** - AI服务集中管理 ⭐️
```
文件：backend/src/openai/openai.module.ts
标记：@Global() - 全局作用域

核心服务：OpenaiService
功能：
  1️⃣  创建流式聊天接口
      createChatStream(prompt, sessionId) → Observable<any>
      • 支持Server-Sent Events (SSE) 流式传输
      • 生成并返回唯一sessionId
      • 实时推送AI生成的文字内容

  2️⃣  生成法律文档/分析内容
      generateLegalMarkdown(systemPrompt, userPrompt, temperature) → string
      • systemPrompt: 定义AI的身份和输出格式 (例：律师、法官)
      • userPrompt: 用户的具体需求 (例：案情描述、文书要求)
      • temperature: 创意度 (法律严谨 0.1-0.2、分析 0.3、聊天 0.7-1.0)

依赖：OpenAI SDK v6.29.0
模型：deepseek-chat (可切换为 gpt-4o-mini)
```

---

### 3. **业务功能模块**

#### 3.1 **AuthModule** - 用户认证与注册

**核心文件**
```
- auth.module.ts       (模块声明)
- auth.controller.ts   (HTTP路由)
- auth.service.ts      (核心业务逻辑)
- dto/                 (数据传输对象)
```

**API端点**
```
POST /auth/send-verification-code
  → 发送6位验证码到注册手机
  → 验证码有效期10分钟，保存到DB

POST /auth/register
  → 邮箱+密码+手机号+验证码注册
  → 密码使用bcryptjs哈希加密存储
  → 创建User记录并返回JWT令牌

POST /auth/login
  → 邮箱+密码登录
  → 密码验证成功后返回JWT令牌

POST /auth/reset-password
  → 手机号+新密码+验证码重置密码
```

**数据存储**
```prisma
model User {
  id       Int       @id @default(autoincrement())
  email    String    @unique
  phone    String    @unique
  password String    // bcryptjs哈希值
  points   Int       @default(0)      // 积分系统
  avatarUrl String?  @default(null)   // 头像URL
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationCode {
  id        Int       @id @default(autoincrement())
  phone     String
  code      String    // "123456" 格式
  expiresAt DateTime  // 过期时间戳
  used      Boolean   @default(false)
  createdAt DateTime  @default(now())
}
```

---

#### 3.2 **ChatModule** - 流式AI对话

**核心设计**
```typescript
// 1. 前端发送请求
POST /api/chat/stream
{
  "prompt": "如何应对商业纠纷？",
  "sessionId": "uuid-xxx-xxx"  (可选，用于保持对话上下文)
}

// 2. 后端返回SSE数据流
data: {"type": "session_id", "data": "uuid-123"}
data: {"data": "商业纠纷处"}
data: {"data": "理可以分"}
data: {"data": "为多个环节"}
...结束

// 3. 前端接收流并实时展示
```

**服务链路**
```
ChatController.stream()
  → ChatService.streamChat(prompt, sessionId)
    → OpenaiService.createChatStream(prompt, sessionId)
      → OpenAI API 流式调用
        → 返回 Observable<MessageEvent>
```

**技术亮点**
- ✅ Server-Sent Events (SSE) 实现流式传输
- ✅ RxJS Observable 流管理
- ✅ Session ID 跟踪对话上下文
- ✅ UTF-8流式编码完整性保证

---

#### 3.3 **DocumentModule** - 法律文档生成

**核心功能**
```
智能生成各类法律文书：合同、诉讼文书、协议等
```

**API设计**
```typescript
POST /document/generate
{
  "category": "contract",           // 文书大类
  "docType": "purchase_contract",   // 小类
  "partyA": "甲公司信息",
  "partyB": "乙公司信息",
  "content": "核心事实与诉求..."
}

响应：
{
  "title": "《商品买卖合同》",
  "markdownContent": "# 商品买卖合同\n\n第一条..."
}
```

**生成流程**
```
1. 根据category获取对应的SystemPrompt模板
2. 组装用户Prompt (当事人信息、核心事实)
3. 调用OpenaiService (temperature = 0.2 保证严谨)
4. 解析Markdown结果 (提取标题作为文档名)
5. 返回{title, markdownContent}给前端渲染
```

**质量控制**
- 🎯 Temperature = 0.2 (极低创意度，确保法律严谨)
- 🎯 System Prompt包含详细的格式要求和免责声明
- 🎯 支持多种文书类型，每种有专门的Prompt模板

---

#### 3.4 **LegalSearchModule** - 法律条文检索

**功能定位**
```
基于用户描述的法律问题，AI智能检索相关法律条文
并提供法条原文和适用分析
```

**API**
```typescript
POST /legal-search/search
{
  "content": "员工离职时能否竞业禁止？"
}

响应 Markdown：
1. **适用法律法规**
   《中华人民共和国劳动法》第二十四条、《竞业禁止协议规范》...

2. **法条原文精要**
   竞业禁止是指...

3. **法条适用分析**
   在您的案例中，由于...
```

**严谨性保障**
- 🔒 Temperature = 0.1 (最低，绝不编造法条)
- 🔒 Prompt明确要求只引用真实有效的法律
- 🔒 不存在的条文必须说明法理依据

---

#### 3.5 **CaseSummaryModule** - 案情快速梳理

**应用场景**
```
当事人或律师上传杂乱无序的案情描述 → AI自动梳理核心要点
```

**输出结构**
```markdown
1. **争议焦点归纳** - 本案的核心法律争点
2. **法律关系梳理** - 合同关系、侵权关系等
3. **关键事实时间轴** - 重要事件的时间顺序
4. **初步诉讼策略** - 为当事人提供法律行动建议
```

**API**
```typescript
POST /case-summary/summarize
{ "content": "杂乱的案情描述..." }

返回：Markdown格式的结构化案情分析
```

**参数设置**
- Temperature = 0.3 (允许一定逻辑推理，但不过度发散)

---

#### 3.6 **CaseSearchModule** - 类案智能分析

**核心价值**
```
用户提供案情 → AI返回类似案件的裁判趋势和法院关注要点
(模拟现实法律数据库的类案检索功能)
```

**输出内容**
```markdown
1. **相似案件裁判趋势** - 此类案件通常怎么判
2. **法院关注要点** - 法官最看重哪些证据
3. **参考法理与指导性案例** - 最高院指导案例的裁判规则
```

**Temperature = 0.3** (需要发散式总结，但保持逻辑严密)

---

#### 3.7 **ComplianceModule** - 企业合规审查

**应用场景**
```
企业提交商业模式、合同或业务流程 → AI进行法律风险评估
```

**输出报告**
```markdown
1. **核心合规风险提示** - 最致命的法律漏洞
2. **风险等级评估** - 高/中/低风险分级
3. **法律依据** - 触碰的现行法律法规
4. **修改建议与合规方案** - 具体可落地的整改方案
```

**Temperature = 0.2** (合规需极度严谨)

---

### 4. **跨模块通信与依赖注入**

所有业务模块都遵循相同的模式：

```typescript
// 1. 模块声明
@Module({
  controllers: [XXXController],
  providers: [XXXService],
})
export class XXXModule {}

// 2. Service依赖注入
@Injectable()
export class XXXService {
  constructor(
    private readonly openaiService: OpenaiService,  // 全局注入
    private readonly prisma: PrismaService         // 全局注入
  ) {}
}

// 3. Controller路由
@Controller('xxx')
export class XXXController {
  constructor(private readonly xxxService: XXXService) {}
  
  @Post('action')
  async action(@Body() dto: XXXDTO) {
    return this.xxxService.method(dto);
  }
}
```

---

### 5. **数据流与异常处理**

#### 5.1 **请求数据流**
```
HTTP Request
  ↓
Controller (验证装饰器)
  ↓
ValidationPipe (class-validator验证DTO)
  ↓
Service (核心业务逻辑)
  ↓
OpenaiService / PrismaService (外部调用)
  ↓
HTTP Response
```

#### 5.2 **异常处理**
```typescript
// 自定义业务异常
class BusinessException extends Exception {
  constructor(errorCode: ErrorCode) { ... }
}

// 全局异常过滤器
@Catch()
class BusinessExceptionFilter implements ExceptionFilter {
  catch(exception: BusinessException, host: ArgumentsHost) {
    response.status(errorCode.statusCode).json({
      code: errorCode.code,
      message: errorCode.message,
    })
  }
}
```

---

## 前端架构详解

### 1. **技术栈**

```
框架层：React 19.2 + TypeScript + React Router v7
构建工具：Vite 7.3.1 + Tailwind CSS 4.2.1
UI组件库：Ant Design 6.3.1
状态管理：Zustand 5.0.12 (轻量级全局状态)
HTTP客户端：Axios 1.13.6 + EventSource (SSE)
国际化：i18next 25.8.13 + react-i18next
```

---

### 2. **入口文件**

#### 2.1 **[frontend/src/main.tsx](frontend/src/main.tsx)**
```typescript
// 核心配置链：
StyleProvider (Ant Design CSS-in-JS)
  ↓
ConfigProvider (主题theme)
  ↓
AntdApp (Ant Design全局context)
  ↓
AntdGlobalContext (自定义全局context)
  ↓
App (主应用)
```

#### 2.2 **[frontend/src/App.tsx](frontend/src/App.tsx)**

**路由结构**
```
/ 
├─ /login                      (独立页面 - 无侧边栏)
│
└─ / (MainLayout)              (带侧边栏的主页面)
   ├─ /chat/:id?               (AI聊天 - 支持多轮对话)
   ├─ /history                 (对话历史)
   ├─ /account                 (个人信息)
   ├─ /doc/:id?                (法律文档生成)
   ├─ /law                     (法律条文检索)
   ├─ /case_search             (案例智能分析)
   ├─ /case_review             (案情快速梳理)
   ├─ /compliance/:id?         (合规审查)
   ├─ /vip                     (VIP会员)
   ├─ /orders                  (订单列表)
   └─ /points                  (积分记录)
```

**性能优化**
- ✅ 使用 `React.lazy()` 实现路由级代码分割
- ✅ 用 `Suspense` 包裹路由，显示加载动画
- ✅ MainLayout 保持挂载 (不懒加载外壳组件)
- ✅ 支持国际化主题切换

---

### 3. **主要页面组件**

```
pages/
├─ Auth/
│  └─ AuthPage.tsx              (登录/注册表单)
│
├─ AIChatPage.tsx               (流式对话 + SSE接收)
│  ├─ 发送prompt
│  ├─ 接收EventSource数据流
│  └─ 实时渲染Markdown
│
├─ DocPage.tsx                  (文档生成向导)
│  ├─ 选择文书类型
│  ├─ 填写当事人信息
│  └─ 生成并预览文档
│
├─ LegalSearchPage.tsx          (法律条文检索)
│  ├─ 输入法律问题
│  └─ 显示条文与分析
│
├─ CaseSearchPage.tsx           (案例分析)
├─ CaseReviewPage.tsx           (案情梳理)
├─ CompliancePage.tsx           (合规审查)
│
├─ Account/
│  └─ AccountInfoPage.tsx       (个人资料)
│
├─ HistoryPage.tsx              (对话记录)
├─ MembershipPage.tsx           (VIP订阅)
├─ OrderListPage.tsx            (订单管理)
└─ PointsRecordPage.tsx         (积分明细)
```

---

### 4. **状态管理** (Zustand)

```typescript
// 全局状态店铺 (store/)
useAuthStore          // 当前用户、token、登录状态
useThemeStore         // 主题色、语言、外观设置
useChatStore          // 对话列表、当前对话、消息历史
usePointsStore        // 用户积分、消费记录
```

---

### 5. **组件通信流程**

```
Page Component
  ↓ (props/context)
  ├─ Layout Component
  │   └─ Header / Sidebar
  │
  ├─ Content Component
  │   ├─ Display Component (纯渲染)
  │   └─ Form Component (表单)
  │       └─ Submit
  │
└─ API Call (axios)
    ↓
  Backend Service
```

---

### 6. **HTTP请求示例**

```typescript
// 1. 常规POST请求
const response = await axios.post('/api/chat/generate', {
  prompt: "起草购买合同"
})
// 返回 { title, markdownContent }

// 2. 流式GET请求 (SSE)
const eventSource = new EventSource(
  '/api/chat/stream?prompt=xxx&sessionId=yyy'
)
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data)
  // 实时追加文字
}
```

---

## API 列表

### 认证服务
```
POST /auth/send-verification-code    发送验证码
POST /auth/register                  注册账户
POST /auth/login                     登录
POST /auth/reset-password            重置密码
```

### 聊天服务
```
POST /api/chat/stream                流式AI聊天 (SSE)
  返回：MessageEvent流 { type, data, sessionId }
```

### 文档生成
```
POST /document/generate              生成法律文档
  返回：{ title, markdownContent }
```

### 法律检索
```
POST /legal-search/search            搜索相关法条
  返回：Markdown格式的法条与分析
```

### 案例分析
```
POST /case-search/search             分析类案趋势
  返回：Markdown格式的案例分析

POST /case-summary/summarize         梳理案情
  返回：Markdown格式的案情总结
```

### 合规审查
```
POST /compliance/analyze             进行合规审查
  返回：Markdown格式的风险报告
```

---

## 关键设计模式

### 1. **观察者模式** (Observer Pattern)
```typescript
// ChatService 返回 Observable，前端订阅数据流
OpenaiService.createChatStream() → Observable<data>
→ Front-end subscribes via EventSource
→ Real-time data emission
```

### 2. **策略模式** (Strategy Pattern)
```typescript
// 不同的文书/分析有不同的SystemPrompt策略
DOCUMENT_SYSTEM_PROMPTS = {
  contract: "你是合同律师...",
  litigation: "你是诉讼律师...",
  compliance: "你是风控律师..."
}
// 根据用户选择调用不同的AI策略
```

### 3. **工厂模式** (Factory Pattern)
```typescript
// ResponseDto 工厂方法简化响应构造
ResponseDto.success(data)
ResponseDto.error(errorCode)
```

### 4. **依赖注入模式** (Dependency Injection)
```typescript
// NestJS自动管理依赖生命周期
constructor(
  private openaiService: OpenaiService,
  private prisma: PrismaService
) {}
// 自动注入全局单例
```

---

## 数据库设计

### 当前模式
```prisma
model User {
  id          Int     @id @default(autoincrement())
  email       String  @unique
  phone       String  @unique
  password    String  // bcryptjs加密
  points      Int     @default(0)
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model VerificationCode {
  id        Int     @id @default(autoincrement())
  phone     String
  code      String
  expiresAt DateTime
  used      Boolean @default(false)
  createdAt DateTime @default(now())
}
```

### 潜在扩展
```prism
model ChatSession {     // 记录对话历史
  id          Int
  userId      Int
  title       String
  messages    Message[]
  createdAt   DateTime
}

model Message {         // 单条消息
  id          Int
  sessionId   Int
  role        String    // "user" | "assistant"
  content     String    // 完整消息文本
  createdAt   DateTime
}

model Document {        // 生成的文档
  id          Int
  userId      Int
  category    String    // "contract", "litigation"
  title       String
  markdown    String
  createdAt   DateTime
}

model ComplianceReport {  // 合规审查记录
  id          Int
  userId      Int
  content     String
  riskLevel   String    // "HIGH" | "MEDIUM" | "LOW"
  analysis    String    // Markdown 分析结果
  createdAt   DateTime
}
```

---

## 系统集成点

### 核心集成：OpenAI
```
配置：
  - API Key: process.env.OPENAI_API_KEY
  - Base URL: process.env.OPENAI_BASE_URL (支持兼容API如deepseek)
  - Model: 'deepseek-chat' (可切换gpt-4o-mini)

调用模式：
  1. 流式聊天：chat.completions.create({ stream: true })
  2. 文本生成：chat.completions.create({ stream: false })
  
错误处理：
  - API超时 → InternalServerErrorException
  - 速率限制 → Retry with exponential backoff
  - 无效token → ConfigService error提示
```

### 数据库集成：PostgreSQL
```
配置：DATABASE_URL (Prisma自动读取)
连接池：@prisma/adapter-pg 管理
Schema版本：prisma/migrations/ 记录

迁移流程：
  1. 修改 schema.prisma
  2. 运行 npx prisma migrate dev --name "描述"
  3. 自动生成migration文件
  4. 自动更新Prisma Client
```

---

## 部署与配置

### 环境变量 (.env)
```bash
# OpenAI API
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/nexus_law

# 服务器
PORT=3000
NODE_ENV=production

# 可选：Redis（未来用于session/缓存）
# REDIS_URL=redis://localhost:6379
```

### 构建命令
```bash
# 后端
npm run build          # 编译TypeScript
npm run start          # 启动生产服务
npm run start:dev      # 开发模式(热加载)

# 前端
npm run build          # 打包生产版本
npm run dev            # 开发服务器(Vite)
npm run preview        # 生产包本地预览
```

---

## 交互流程示例

### 场景1：用户发送法律问题 (流式对话)
```
1️⃣  Frontend
    POST /api/chat/stream
    Body: { prompt: "交通事故责任怎么判定？" }

2️⃣  Backend (ChatController)
    → ChatService.streamChat(prompt)
    → OpenaiService.createChatStream(prompt)

3️⃣  OpenAI API
    调用 chat.completions.create({ stream: true })
    返回数据块流

4️⃣  Frontend (EventSource)
    接收SSE事件流
    逐字显示AI回复
    
5️⃣  前端渲染
    ✓ 显示Markdown格式化内容
    ✓ 复制/分享按钮
    ✓ 评分反馈
```

### 场景2：用户生成法律文档
```
1️⃣  Frontend (DocPage)
    选择: 合同 → 购买合同
    输入: 甲方信息、乙方信息、核心条款

2️⃣  POST /document/generate
    Body: {
      category: "contract",
      docType: "purchase_contract",
      partyA: "xxx公司",
      partyB: "yyy公司",
      content: "甲方购买乙方商品..."
    }

3️⃣  Backend
    → DocumentService.generateLegalDocument()
    匹配SystemPrompt → "你是资深商务律师..."
    拼装UserPrompt
    → OpenaiService.generateLegalMarkdown(system, user, 0.2)

4️⃣  OpenAI API
    返回完整Markdown文档

5️⃣  Frontend UI
    标题: 《商品购买合同》
    内容: 格式化Markdown渲染
    操作: 下载PDF / 分享 / 编辑
```

---

## 性能优化点

### 后端
- ✅ 流式响应减少首字节延迟
- ✅ 全局Exception Filter统一处理
- ✅ ValidationPipe提前验证避免无效计算
- ✅ 环境变量ConfigModule缓存避免重复读取
- ✅ 数据库连接池管理 (@prisma/adapter-pg)

### 前端
- ✅ 路由级代码分割 (React.lazy + Suspense)
- ✅ 国际化文件分离加载
- ✅ Ant Design 按需导入
- ✅ Zustand轻量级状态管理无过度re-render
- ✅ Markdown流式渲染避免DOM阻塞

---

## 扩展方向

### 短期
```
□ 添加对话历史持久化 (ChatSession/Message表)
□ 实现用户点赞/反馈收集
□ 文档版本控制与PDF导出
□ 对话时长限制与积分扣费
```

### 中期
```
□ 集成真实法律数据库 (中国裁判文书网等)
□ 向量数据库 + RAG实现精准案例检索
□ 用户权限管理 (RBAC)
□ 审计日志记录 (谁在什么时间做了什么)
□ 缓存层 (Redis) 优化热查询
```

### 长期
```
□ 多模型支持 (gpt-4, claude, 本地模型)
□ 知识库微调 (Fine-tuning法律特定数据)
□ 实时增量同步 (关注新法律发布)
□ 企业版 SaaS (私有部署、自定义模型)
□ 移动端 (React Native / Flutter)
```

---

## 总结

**Nexus Law** 是一个**现代AI应用的典范**：

| 方面 | 特点 |
|------|------|
| **架构** | 清晰的模块化设计，全局依赖注入，关注点分离 |
| **AI集成** | 流式输出、多态SystemPrompt、温度参数精确控制 |
| **数据处理** | SSE流式传输、RxJS Observable、实时渲染 |
| **用户体验** | 路由分割、流式加载、国际化支持、主题定制 |
| **代码质量** | TypeScript全覆盖、全局异常处理、验证管道、单元测试 |
| **扩展性** | 模块独立、数据库模式预留扩展空间、环境配置隔离 |

---

**项目已准备就绪，可以开始逐步添加更多法律智能功能！** 🚀
