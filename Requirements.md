# Nexus Law 项目需求文档（面向 AI 实现）

> 本文档是 Nexus Law 的**唯一产品与实现约束源**。后续设计、编码、接口、表结构、权限与验收均以本文为准。  
> 书写原则：先给出全局结论，再按模块展开不可歧义的细则，最后用边界与验收口径收束。  
> 文中 **MUST / MUST NOT / SHOULD** 分别表示强制、禁止、建议。

---

## 一、总述：项目是什么、为谁、做成什么样

Nexus Law 是面向**某法律公司**交付的 **智能法律问答 Web 系统**。系统利用大模型的推理能力，结合公司自建的**专业法律知识库**（含国家法、地方法规、行业规范与内部资料），为两类用户提供可信、可追溯的法律问答服务：

| 用户角色 | 使用目标 | 体验重点 |
|---|---|---|
| 普通大众 | 快速理解法律问题、获得通俗解释与下一步建议 | 易用、安全、答案可引用条文 |
| 专业律师 | 辅助检索、推理、引用与持续对话 | 专业、可回溯、可管理知识与提示词 |

系统不是通用聊天机器人，而是**法律场景的垂直问答产品**。核心交付闭环为：

1. 用户注册登录后发起法律问题。
2. Agent 结合知识库检索与模型推理给出回答（Markdown 展示）。
3. 对话可保存、可搜索、可按时间排序分页回溯。
4. 问答消耗积分；用户可充值积分或订阅会员。
5. 管理员在后台管理用户、提示词、Agent 权限、知识库与消费记录。

**本阶段产品边界（MUST）**：先完整交付「账号 + 对话 + 知识库 + 积分/会员 + 后台管理」闭环。文档生成、案例检索、合规审查等扩展能力不在本需求强制范围内，未写入本文的功能 MUST NOT 擅自实现。

---

## 二、分述：技术、规范与业务细则

### 2.1 技术栈（MUST）

| 层级 | 选型 | 约束 |
|---|---|---|
| C 端前端 | React + Ant Design + react-markdown | 仅服务普通用户/律师问答站点；问答内容以 Markdown 渲染；UI 组件优先 Ant Design |
| 管理端前端 | [Shadcn Admin](https://github.com/satnaing/shadcn-admin)（Shadcn UI + Vite + TanStack Router） | 仅服务运营/超管后台；MUST 基于该开源模板单独建工程，不得塞进 C 端 |
| 后端 | FastAPI | 同步请求走 FastAPI；禁止把耗时任务塞进请求线程阻塞响应 |
| 异步任务 | Celery | 知识库解析/向量化、支付回调后处理、积分入账、邮件/短信等 MUST 走 Celery |
| 鉴权 | JWT | Access Token 置于 `Authorization: Bearer <token>`；C 端与管理端共用同一套签发规则 |
| 权限 | RBAC | 角色绑定权限点；接口与菜单均按权限点校验 |
| 数据 | 关系型数据库（PostgreSQL）+ 向量库 | 业务数据在关系库；法律知识检索走向量库 |
| 接口风格 | 仅 GET / POST | MUST NOT 使用 PUT / PATCH / DELETE；MUST NOT 按 REST 资源动词设计 |

仓库目录（MUST，三者并列、互不嵌套）：

```text
nexus-law/
├── frontend/     # C 端：React + Ant Design
├── admin/        # 管理端：基于 Shadcn Admin 的独立工程
└── backend/      # FastAPI + Celery
```

- `admin/` MUST 作为独立前端工程（独立 `package.json`、独立开发端口、独立构建产物），以 satnaing/shadcn-admin 为起点裁剪演示页后接入本系统后台接口。
- MUST NOT 在 `frontend/` 内用 Ant Design 再做一套 `/admin` 路由冒充管理端。
- MUST NOT 把 Ant Design 引入 `admin/`，也 MUST NOT 把 Shadcn Admin 组件引入 `frontend/`。
- 两个前端 MUST NOT 直连大模型、支付渠道或向量库，一律走 FastAPI。

---

### 2.2 全局铁律（所有模块必须遵守）

#### 2.2.1 数据表公共字段（MUST）

每一张业务表 MUST 包含以下字段，字段名不得改写：

| 字段 | 类型建议 | 说明 |
|---|---|---|
| `id` | UUID 字符串 或 雪花/自增主键，全库统一一种 | 主键；接口对外一律字符串 |
| `created_at` | 带时区时间戳 | 创建时间，写入后不可改 |
| `updated_at` | 带时区时间戳 | 任意业务字段变更时自动更新 |
| `is_deleted` | 布尔，默认 `false` | 逻辑删除；查询默认排除 `is_deleted=true` |

补充约束：

- 删除一律逻辑删除（`is_deleted=true`），MUST NOT 物理删除，除非后台提供「彻底清理」且单独授权。
- 所有列表/详情查询 MUST 默认过滤已删除数据。
- 索引至少覆盖：主键、`is_deleted`、高频筛选字段、排序字段、以及所有逻辑外键列（如 `user_id`、`conversation_id`）。逻辑外键规则见 2.2.5。

#### 2.2.2 统一响应格式（MUST）

所有 HTTP 接口（含错误）MUST 返回 JSON：

```json
{
  "code": 0,
  "data": {},
  "message": "ok"
}
```

| 字段 | 类型 | 规则 |
|---|---|---|
| `code` | number | `0` 表示成功；非 `0` 表示失败。HTTP 状态码固定 `200`（网络真正不可达除外） |
| `data` | any | 成功时为业务数据；失败时可为 `null` 或补充错误上下文，但不得用 HTTP 状态表达业务错误 |
| `message` | string | 给人看的说明；成功可用 `"ok"`；失败必须是可展示文案 |

推荐业务码分段（可扩展，不得冲突）：

| 区间 | 含义 |
|---|---|
| `0` | 成功 |
| `1000–1999` | 参数/校验错误 |
| `2000–2999` | 认证失败（未登录、Token 过期） |
| `3000–3999` | 权限不足 |
| `4000–4999` | 业务冲突（积分不足、会员不可重复开通等） |
| `5000–5999` | 服务端错误 |

分页列表的 `data` MUST 统一为：

```json
{
  "records": [],
  "total": 0,
  "current": 1,
  "size": 20,
  "pages": 0
}
```

#### 2.2.3 接口风格：只允许 GET 与 POST（MUST）

- **GET**：只读查询。筛选、排序、分页用 Query 参数。GET MUST NOT 产生副作用。
- **POST**：所有写操作（创建、更新、删除、登录、下单、充值、发布知识库等）。动作放在路径中，例如 `/conversation/create`、`/conversation/delete`。
- 路径形态：`/api/v1/{module}/{action}`。
- MUST NOT 使用 REST 式 `PUT /resources/{id}`、`DELETE /resources/{id}`。
- 详情查询可用 GET：`/api/v1/{module}/detail?id=...`。
- 文件上传用 POST `multipart/form-data`，响应仍走统一 `{ code, data, message }`。
- 流式问答例外：允许 `POST` + SSE（`text/event-stream`）。SSE 事件体内的业务终态仍应能映射到 `code/data/message` 语义；非流式接口不得用 SSE。

#### 2.2.4 鉴权与安全（MUST）

- 除「注册、登录、验证码、健康检查、支付回调」外，接口 MUST 校验 JWT。
- JWT Payload 至少包含：`user_id`、`role_codes`、过期时间。
- 密码 MUST 哈希存储；验证码有过期与一次性使用限制。
- 后端 MUST 做参数校验、越权校验（用户只能操作自己的对话/订单，管理员除外）。
- 法律回答 MUST 标注「不构成正式法律意见」类免责声明（前端固定展示 + 系统提示词约束）。

#### 2.2.5 逻辑外键：只在 SQLAlchemy 声明，物理库不建 FOREIGN KEY（MUST）

关联关系 **MUST** 在 ORM 里写清楚，让读模型的人（含 AI）能还原表之间的引用；**MUST NOT** 在 PostgreSQL 等真实库里创建 `FOREIGN KEY` 约束。引用完整性由业务代码保证，库内只给外键列建索引。

| 层 | 做什么 | 禁止做什么 |
|---|---|---|
| SQLAlchemy 模型 | `mapped_column(..., ForeignKey("父表.id"), index=True)`；需要时加 `relationship()` | 为了「库里没外键」而删掉模型上的 `ForeignKey` / `relationship` |
| Alembic / DDL / 真实库 | 为逻辑外键列建普通索引（及业务需要的联合索引） | `CONSTRAINT ... FOREIGN KEY`、`REFERENCES`、`ON DELETE CASCADE/SET NULL` 等数据库级外键 |
| 业务代码 | 写入前校验父行存在且未删除；删除/停用时按产品规则处理子行（逻辑删或拒绝） | 依赖数据库去拦脏数据或自动级联删除 |

实现细则（给 AI 落地）：

1. **模型怎么写（示例，语义必须保留）**

```python
user_id: Mapped[str] = mapped_column(
    String(36),
    ForeignKey("users.id"),  # 仅供 ORM / 读模型的人理解关系，不落到物理库
    index=True,
    nullable=False,
)
user: Mapped["User"] = relationship(back_populates="conversations")
```

2. **Alembic `env.py` MUST** 忽略外键约束对比与生成，例如 `include_object` 在 `type_ == "foreign_key_constraint"` 时返回 `False`。手工迁移同样 MUST NOT `op.create_foreign_key`。
3. **`Base.metadata.create_all` 与生产库行为必须一致**：若开发用 `create_all`，也不得创建物理外键（可通过 `MetaData`/`naming`/`include_object` 或等价手段关掉 FK 产出，只留列和索引）。
4. 逻辑外键列命名保持 `*_id`；联合唯一（如 `user_id + role_id`）仍可在库内建 `UNIQUE` 索引，这不是 FOREIGN KEY。
5. 模型上即使写了 `ondelete="CASCADE"` / `SET NULL`，也只表示业务意图，**真实库不会执行**。级联删除、置空、拒绝删除 MUST 写在 Service 里。
6. 查询关联数据用 SQLAlchemy `relationship` 或显式 `JOIN`；不得假定数据库会拒绝孤儿 `user_id`。

验收口径：`information_schema.table_constraints`（或 `\d 表名`）中不得出现 FOREIGN KEY；对应列上必须有索引；`models.py` 中仍能看到 `ForeignKey("表.列")`。

---

### 2.3 RBAC 权限模型

系统采用 **用户 → 角色 → 权限点**。一个用户可有多个角色；权限点同时控制 **API** 与 **菜单/按钮**。

#### 2.3.1 预置角色（MUST 内置，可后台调整权限点，不得删除超管）

| 角色编码 | 名称 | 说明 |
|---|---|---|
| `super_admin` | 超级管理员 | 后台全部权限；不可删除、不可降权最后一个超管 |
| `admin` | 运营管理员 | 用户、订单、积分、会员、消费记录、提示词、知识库 |
| `lawyer` | 专业律师 | C 端全部问答能力；可使用专业 Agent / 专业知识库（由权限点控制） |
| `user` | 普通用户 | C 端基础问答、积分购买、会员订阅 |

未登录用户 MUST NOT 发起正式问答、查看历史、购买套餐。

#### 2.3.2 权限点示例（实现时按此命名空间扩展）

| 权限点 | 含义 |
|---|---|
| `chat:use` | 发起智能对话 |
| `chat:history` | 查看/搜索自己的历史对话 |
| `kb:retrieve` | 问答时检索知识库 |
| `kb:manage` | 后台管理知识库 |
| `prompt:manage` | 后台管理提示词 |
| `agent:manage` | 后台配置 Agent 与工具白名单 |
| `user:manage` | 后台管理用户与角色 |
| `order:manage` | 后台查看订单 |
| `billing:view` | 查看消费记录（后台看全量，C 端只看自己） |
| `plan:manage` | 配置会员套餐 |
| `points:recharge` | 积分充值（C 端下单） |

接口层 MUST 校验权限点，MUST NOT 只靠前端藏按钮。

---

### 2.4 用户与账号

**目标**：普通用户与律师均可注册登录；律师角色可由管理员授予，或按运营规则在注册后审核（本需求默认：注册为 `user`，律师身份由管理员分配角色）。

功能清单：

1. 注册：手机号或邮箱 + 验证码 + 密码。同一手机号/邮箱不可重复注册。
2. 登录：密码登录、验证码登录。成功返回 JWT 与用户资料（含角色、积分余额、会员状态）。
3. 找回/重置密码。
4. 个人中心：头像、昵称、手机号、邮箱、修改密码。
5. 登出：前端清除 Token；后端可将 Token 加入短时黑名单（SHOULD）。

校验：

- 未登录访问受保护页，前端跳转登录，后端返回 `code` 属于 2000 段。
- 登录态失效后，前端统一拦截并跳转登录，不得死循环请求。

---

### 2.5 智能对话模块（核心）

**目标**：用户用自然语言提问，系统结合法律知识库与模型推理作答；对话可连续、可回溯、可检索。

#### 2.5.1 对话能力

- **会话随问答隐式创建（沿用现有逻辑，MUST）**：不提供独立的「创建会话」或「会话详情」接口。用户发起 `POST /agent/run/stream` 时：
  - 不传 `conversation_id`：后端创建新会话，并在 SSE 首帧（如 `conversation_meta`）回传新的 `conversation_id`，前端据此进入该会话。
  - 传入已有 `conversation_id`：在该会话上继续提问，携带历史上下文。
- 回答流式输出（SSE），前端用 react-markdown 渲染。
- 回答 SHOULD 引用知识库来源（法规名称、条款号、文档标题）；无检索结果时必须明确说明「未命中知识库，以下为模型一般性推理」，禁止伪装成法条原文。
- 每次成功问答按规则扣积分（见 2.7）；积分不足时拒绝调用模型，返回 4000 段错误。
- 会话标题：首条用户问题截断生成，允许用户重命名。
- 用户可逻辑删除自己的会话。
- MUST NOT 再增加 `conversation/create`、`conversation/detail`。回溯只走列表 + 消息列表；详情字段若需要，放在 `conversation/list` 的 `records` 中即可。

#### 2.5.2 历史回溯与列表（MUST）

会话列表接口 MUST 同时满足：

| 能力 | 规则 |
|---|---|
| 仅本人数据 | 普通用户/律师只能看自己的会话；管理员可按 user_id 筛选 |
| 分页 | `current`、`size`；`size` 默认 20，上限 100 |
| 关键词模糊搜索 | 对会话标题、最近一条消息摘要或会话内容做 `LIKE/ILIKE`；空关键词表示不筛选 |
| 排序 | `sort_by=created_at` 或 `sort_by=last_message_at`；`order=asc\|desc`，默认 `last_message_at desc` |
| 过滤已删除 | `is_deleted=false` |

`last_message_at`：该会话最后一条消息的 `created_at`；无消息时回退为会话 `created_at`。

进入某条历史后：用 `GET /conversation/messages` 按消息时间正序拉取完整消息；继续提问时把该条 `conversation_id` 传给 `POST /agent/run/stream`。不需要再查会话 detail。

#### 2.5.3 Agent 调用约束

- 编排层与 HTTP 层分离：Router 只做鉴权、校验、扣费前检查；推理在 Agent 服务中完成。
- Agent 可用工具 MUST 受「Agent 权限/工具白名单」约束，不同角色可绑定不同 Agent 或不同工具集。
- 提示词不写死在前端或 Router，统一从提示词表读取（可按 Agent、角色覆盖）。

---

### 2.6 法律知识库

**目标**：构建可运营的专业法律知识库，覆盖国家法律及**地方性法规/本地法律**，供 Agent 检索增强（RAG）。

能力：

1. 管理员上传法规/文档（PDF、Word、Markdown、TXT）。
2. Celery 异步：解析 → 切分 → 向量化 → 写入向量库；关系库保存文档元数据与状态。
3. 文档状态机：`uploading` → `parsing` → `draft` → `publishing` → `published` / `failed`。
4. 发布前允许预览/编辑切片（人工校验后再发布）。
5. 元数据至少包含：标题、效力级别（法律/行政法规/地方法规/司法解释/内部资料）、地域（全国或省/市）、生效日期、失效日期、来源。
6. 检索时优先命中有效且地域匹配的条文；过期法规可检索但必须标记「已失效」。
7. 普通用户与律师可配置不同可见知识库范围（通过 Agent/角色绑定数据集）。

知识库文档对 C 端默认不直接开放全文浏览，问答引用即可；是否提供法规检索页不在本需求强制范围。

---

### 2.7 积分、会员与消费

**目标**：用积分计量 AI 调用；用会员订阅提供额度/折扣/权益。用户可购买积分，也可购买多种会员。

#### 2.7.1 积分

- 用户表维护 `points` 余额，变更必须写积分流水，禁止只改余额不记账。
- 流水类型：`recharge`（购买）、`subscribe_gift`（会员赠送）、`consume_chat`（对话消耗）、`refund`、`admin_adjust`。
- 扣减必须原子操作：余额不足则失败，不得把余额扣成负数。
- C 端可分页查看自己的积分流水。

#### 2.7.2 会员订阅

系统支持多种套餐（后台可配置，不写死价格），例如：

| 套餐类型（示例） | 典型权益 |
|---|---|
| 月度会员 | 周期内每日/每月赠送积分，或对话折扣 |
| 年度会员 | 更高额度、更长有效期 |
| 律师专业版 | 专业 Agent、更广知识库、更高配额 |

约束：

- 同一用户同一时间对同一「互斥组」套餐只能有一条有效订阅；续费延长 `expire_at`。
- 会员状态：`pending` / `active` / `expired` / `cancelled`。
- 权益以套餐配置为准（赠送积分、折扣率、可用 Agent、可用知识库）。
- 到期后自动降为普通用户权益，已购积分保留。

#### 2.7.3 购买与订单

- 用户可下单：积分充值包 或 会员套餐。
- 订单状态：`pending` → `paid` → `fulfilled`；失败为 `cancelled` / `refunded`。
- 支付成功回调 MUST 幂等：同一订单只入账一次。
- 入账、开通会员、发送通知等 SHOULD 由 Celery 执行，接口只创建订单并返回支付参数。
- C 端订单列表分页；后台可按用户、状态、时间筛选。

---

### 2.8 后台管理系统

**目标**：法律公司运营人员管理内容、权限与账务，而不是改代码。

#### 2.8.1 独立工程（MUST）

管理端前端 MUST 单独放在仓库根目录的 `admin/`，基于开源框架 **Shadcn Admin**（[satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin)）实现，不得与 C 端 `frontend/` 混在同一工程。

| 项 | 约定 |
|---|---|
| 工程路径 | `admin/`（独立 Vite 工程） |
| 模板来源 | Shadcn Admin：Shadcn UI + Tailwind + Vite + TanStack Router |
| 登录入口 | 管理端自有登录页；无 `admin` / `super_admin` 角色不得进入 |
| 鉴权 | 与 C 端共用后端 JWT + RBAC；Token 分端存储，互不复用 localStorage 键名建议加前缀（如 `admin_token`） |
| 接口 | 只调 FastAPI 后台 action；菜单/按钮按权限点隐藏，接口仍须后端二次校验 |
| 部署 | 独立域名或独立端口；MUST NOT 作为 C 端子路由发布 |

落地时：克隆/复制 Shadcn Admin 骨架到 `admin/`，删除与本系统无关的演示业务页，按 2.8.2 接入真实模块。保留其 Sidebar、表格、表单、主题等基础设施。

无后台权限的用户 MUST NOT 访问后台接口；C 端 JWT 即使用户已登录，只要角色不含管理权限，管理端 MUST 拒绝进入。

#### 2.8.2 功能模块

后台 MUST 包含：

| 模块 | 功能要点 |
|---|---|
| 用户与角色 | 用户列表、启用/禁用、分配角色、调整积分 |
| 提示词管理 | 按场景/Agent 维护系统提示词；版本、启用/停用；发布后对话立即生效 |
| Agent 权限 | Agent 定义、绑定角色、工具白名单、关联知识库、是否启用、调用温度等 |
| 知识库管理 | 上传、切片审核、发布、下架、按地域/效力筛选 |
| 套餐与商品 | 会员套餐、积分充值档位、上下架 |
| 订单管理 | 订单查询、状态、补单（需高权限） |
| 消费记录 | 全站对话消耗、积分变动、按用户/时间聚合；支持导出 SHOULD |
| 操作日志 | 管理员关键操作留痕（改提示词、改角色、调积分） |

提示词与 Agent 是本系统可运营性的关键：模型表现问题应优先改提示词与知识库，而不是改前端文案。

---

### 2.9 核心数据对象（逻辑模型）

下列为逻辑实体，不是最终 DDL。每张表仍须满足 2.2.1。表之间的引用在 **SQLAlchemy 用 `ForeignKey` + `relationship` 声明**（见 2.2.5），物理库 **不建 FOREIGN KEY**，只给 `*_id` 列建索引。名称可按实现微调，语义不得缺。

| 实体 | 关键字段（除公共字段外） |
|---|---|
| `users` | email, phone, password_hash, nickname, avatar_url, points, status |
| `roles` | code, name, description |
| `permissions` | code, name, type(api/menu) |
| `user_roles` | user_id, role_id |
| `role_permissions` | role_id, permission_id |
| `conversations` | user_id, title, last_message_at, agent_id |
| `messages` | conversation_id, role, content, token_usage, points_cost, sources_json |
| `prompts` | agent_id, scene, content, version, is_active |
| `agents` | name, code, description, tool_whitelist, is_active |
| `agent_role_binds` | agent_id, role_id |
| `datasets` | name, title, region, visibility |
| `documents` | dataset_id, title, law_level, region, status, effective_at, expired_at |
| `document_chunks` | document_id, ordinal, content |
| `point_ledgers` | user_id, change, balance, type, biz_id, remark |
| `plans` | name, type, price, period, benefits_json, is_active |
| `subscriptions` | user_id, plan_id, start_at, expire_at, status |
| `orders` | user_id, product_type, product_id, amount, status, channel, paid_at |
| `admin_audit_logs` | admin_id, action, target_type, target_id, detail_json |

---

### 2.10 接口清单（最小闭环）

以下为必须实现的 action 列表。均为 `/api/v1/...`，仅 GET 或 POST。

**账号**

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/send_code`
- `POST /auth/reset_password`
- `GET  /user/profile`
- `POST /user/profile/update`
- `POST /user/password/update`

**对话**

- `POST /agent/run/stream`（SSE 问答。不传 `conversation_id` 即创建新会话；传入则在该会话继续。首帧回传 `conversation_id`）
- `GET  /conversation/list`（分页、关键词、`sort_by`、`order`；`records` 含列表所需字段，不再单独提供 detail）
- `GET  /conversation/messages`（按 `conversation_id` 拉取消息，用于历史回溯）
- `POST /conversation/rename`
- `POST /conversation/delete`

**积分 / 会员 / 订单**

- `GET  /points/ledger`
- `GET  /plan/list`
- `POST /order/create`
- `GET  /order/list`
- `GET  /order/detail`
- `POST /payment/callback`（渠道回调，验签，幂等）
- `GET  /subscription/current`

**后台（均需对应权限点）**

- `GET/POST` 用户、角色、权限绑定
- `GET/POST` 提示词 CRUD（删除为 POST delete）
- `GET/POST` Agent 与工具白名单、角色绑定
- `GET/POST` 知识库数据集/文档上传/发布/下架
- `GET` 消费记录、订单、积分流水（全站）
- `GET/POST` 套餐配置

健康检查：`GET /health`，无需登录。

---

### 2.11 前端信息架构

**C 端** `frontend/`（普通用户 / 律师，Ant Design）：

- 登录 / 注册 / 重置密码
- 智能问答（主界面，Markdown 渲染）
- 历史对话（搜索、排序、分页、进入回溯）
- 会员订阅
- 积分充值与积分明细
- 订单列表
- 账户信息

**管理端** `admin/`（运营 / 超管，Shadcn Admin 独立工程）：

- 管理端登录
- 用户与 RBAC
- 提示词
- Agent 权限
- 知识库
- 套餐 / 订单 / 消费记录
- 操作日志

律师与普通用户共用 C 端；差异只来自角色对应的 Agent、知识库与配额，不单独做第二套问答 UI。管理员日常运营只走 `admin/`，MUST NOT 把后台菜单做进 C 端。

---

### 2.12 非功能需求

| 项 | 要求 |
|---|---|
| 性能 | 对话首 token 应尽快返回；知识库解析不得阻塞 HTTP |
| 并发 | 积分扣减与订单入账必须事务/锁，防止超卖 |
| 审计 | 管理端改提示词、改权限、改积分必须记日志 |
| 合规 | 展示免责声明；用户对话属于隐私数据，默认仅本人与授权管理员可见 |
| 可运维 | 配置走环境变量；禁止硬编码密钥 |
| 国际化 | 前端可保留多语言能力，但本需求文案与验收以中文为准 |

---

## 三、总收：范围边界、实现原则与验收口径

### 3.1 一句话收束

Nexus Law 要用 **C 端（`frontend/`：React + Ant Design + Markdown）** 服务大众和律师问答，用 **管理端（`admin/`：Shadcn Admin 独立工程）** 运营提示词、Agent 权限和消费账本，后端为 **FastAPI + Celery**，鉴权为 **JWT + RBAC**。知识库覆盖本地法律，商业闭环是积分与会员。全局必须遵守：**表有四字段、接口只有 GET/POST、响应永远是 `{ code, data, message }`、外键只存在于 SQLAlchemy 声明、物理库只建索引。**

### 3.2 给实现者的硬约束（MUST）

1. 先实现本文第 2.10 节最小闭环，再谈扩展功能。
2. 不得引入 RESTful 资源动词，不得使用 PUT/PATCH/DELETE。
3. 不得省略 `is_deleted` 或改用物理删除作为默认删除。
4. 不得把提示词写死在前端；不得让前端直连 LLM。
5. 不得在未扣积分成功时调用收费模型。
6. 不得新增 `conversation/create` 或 `conversation/detail`；会话只在 `POST /agent/run/stream` 未传 `conversation_id` 时由后端创建。
7. 不得让普通用户越权读取他人会话、订单、消费记录。
8. 知识库未发布切片不得进入检索。
9. 任何新表都必须带 `id, created_at, updated_at, is_deleted`。
10. 管理端 MUST 放在独立工程 `admin/`，基于 Shadcn Admin 实现；不得在 `frontend/` 内做后台，不得把两套 UI 库交叉引入。
11. 外键只在 SQLAlchemy 用 `ForeignKey` / `relationship` 声明；Alembic 与真实库 MUST NOT 创建 FOREIGN KEY，逻辑外键列 MUST 建索引，引用完整性由业务代码保证。

### 3.3 明确不做（MUST NOT 当作本需求已承诺）

- 律师端独立 App / 小程序
- 人工律师实时咨询、案件承办 CRM
- 法庭电子送达、官方司法系统对接
- 多租户 SaaS 计费（本系统按单法律公司部署）
- 使用 PUT/DELETE 的开放 REST API
- 独立的会话创建接口、会话详情接口（会话随问答创建；回溯用 list + messages）
- 在 C 端 `frontend/` 内用 Ant Design 做 `/admin` 后台，或把管理端与 C 端打成同一个前端工程
- 在 PostgreSQL（或其它真实库）创建 `FOREIGN KEY` / `REFERENCES` 约束；也不得为了避开物理外键而从 SQLAlchemy 模型中删除 `ForeignKey`
- 未在本文出现的「文档生成 / 合规审查 / 案例检索」等扩展模块（可列为后续迭代，本需求不验收）

### 3.4 验收清单

完成本需求需同时满足：

- [ ] 用户可注册、登录，JWT 访问受保护接口
- [ ] RBAC 生效：无权限调用后台接口返回 3000 段
- [ ] 不传 `conversation_id` 发起流式问答即创建会话，并在 SSE 中拿到新 `conversation_id`；传入则继续原会话；回答流式输出且 Markdown 正常渲染
- [ ] 无独立的 conversation create / detail 接口
- [ ] 历史对话支持关键词模糊搜索、按创建时间或最新消息时间排序、分页
- [ ] 历史对话通过 messages 回溯，再带 `conversation_id` 继续提问
- [ ] 知识库可上传本地/地方法规并异步入库，发布后能被问答引用
- [ ] 问答扣积分，余额不足不可对话；可购买积分并看到流水
- [ ] 可购买至少两种会员套餐，权益到期后失效
- [ ] 管理端为独立工程 `admin/`，基于 Shadcn Admin，可维护提示词、Agent 权限、用户消费记录；无管理角色无法进入
- [ ] 所有接口仅 GET/POST，响应均为 `{ code, data, message }`
- [ ] 全表具备 `id, created_at, updated_at, is_deleted`
- [ ] SQLAlchemy 模型保留 `ForeignKey` / `relationship`；真实库无 FOREIGN KEY 约束，逻辑外键列有索引

---

**文档状态**：需求冻结稿（Stage 0）  
**使用对象**：产品、后端、前端、以及按本文直接落地的 AI 编码代理  
**解释权**：与本文冲突的旧架构说明（例如 REST、NestJS 作为主后端）一律以本文为准。
