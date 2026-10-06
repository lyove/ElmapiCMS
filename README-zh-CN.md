# ElmapiCMS 4.0

> 基于 **Laravel 13** + **React 19** + **Inertia.js 2** 构建的无头（Headless）内容管理系统。

ElmapiCMS 是一款商业、可自托管的无头 CMS。你可以在现代化的 React 管理后台中，通过**项目（Project）**、**内容集合（Collection）**和**字段（Field）**来定义内容模型，再通过 **REST API**（或官方 Starter 模板）在任何前端中消费这些内容。内置多语言内容、素材库、版本历史、终端用户认证、出站 Webhook、AI 辅助以及细粒度的角色/权限管理。

- **许可证**：商业专有
- **版本**：4.0.0

---

## 目录

1. [仓库结构](#仓库结构)
2. [核心特性](#核心特性)
3. [技术栈](#技术栈)
4. [环境要求](#环境要求)
5. [安装（本地开发）](#安装本地开发)
6. [快速上手](#快速上手)
7. [无头 REST API](#无头-rest-api)
8. [终端用户认证（Project Auth）](#终端用户认证project-auth)
9. [AI 功能](#ai-功能)
10. [Webhook](#webhook)
11. [前端模板（elmapicms-templates）](#前端模板elmapicms-templates)
12. [网页安装器（elmapicms-installer）](#网页安装器elmapicms-installer)
13. [环境变量](#环境变量)
14. [测试与代码质量](#测试与代码质量)
15. [部署说明](#部署说明)
16. [许可证](#许可证)

---

## 仓库结构

仓库根目录包含多个部分，**核心应用是 `elmapicms/` 文件夹**，其余内容都是围绕它进行支撑或分发的。

| 路径 | 说明 |
|---|---|
| **`elmapicms/`** | CMS 应用本体（Laravel 后端 + React/Inertia 管理后台 SPA）。**这是本项目的主体。** |
| `elmapicms-installer/` | CMS 的打包分发版本，附带基于网页的安装器（`public/install.php`），适用于共享主机环境。 |
| `elmapicms-templates/` | 生产可用的前端 Starter 模板（Next.js / Nuxt / Astro），通过 API 消费 ElmapiCMS 项目内容。 |
| `elmapicms.sql` | 数据库转储文件（参考快照）。 |
| `DOCUMENTATION.html` | 指向在线文档的入口页。 |
| `vendor/` | Composer 依赖（在仓库根目录）。 |

### `elmapicms/` 目录速览

```
elmapicms/
├── app/
│   ├── Ai/                    # AI 智能体与工具（Elmapi 助手、内容生成）
│   ├── Console/Commands/      # Artisan 命令（ExportProjectTemplate、AuthSecurityGateCheck 等）
│   ├── Http/Controllers/      # Web（Inertia）+ API（REST）控制器
│   │   └── Api/               # 公开无头 API 控制器（含 OpenAPI 注解）
│   ├── Models/                # Eloquent 模型（Project、Collection、Field、ContentEntry、Asset 等）
│   ├── Services/              # Auth（Project Auth）、Webhooks 等服务
│   └── Support/               # 如 ContentEntryWebhookNotifier
├── bootstrap/
├── config/                    # 应用配置，含 openapi.php、project_auth.php、webhooks.php、ai.php
├── database/
│   ├── migrations/            # 数据库迁移（SQLite/MySQL）
│   └── seeders/               # 用户/角色/权限 + 集合/项目模板种子
├── public/                    # Web 根目录（index.php、favicon、logo）
├── resources/
│   ├── js/                    # React 19 + TypeScript + Tailwind 4 管理后台 SPA（Inertia 页面）
│   └── views/                 # Blade 视图（含 swagger-ui）
├── routes/                    # web.php、api.php、auth.php、settings.php、console.php
├── tests/                     # Pest 功能测试与单元测试
├── artisan
├── composer.json
└── package.json
```

---

## 核心特性

**内容建模**
- **项目（Projects）** —— 相互隔离的多租户内容空间，每个项目拥有独立的语言、成员、API Token 和设置；公共 API 可逐项目开关。
- **集合与字段（Collections & Fields）** —— 通过拖拽式字段编辑器自定义内容模型。支持的字段类型：
  `text`（文本）、`longtext`（长文本）、`richtext`（富文本）、`slug`、`email`、`password`、`number`（数字）、`enumeration`（枚举）、`boolean`（布尔）、`color`（颜色）、`date`（日期）、`time`（时间）、`media`（素材）、`relation`（关联）、`json`、`group`（字段分组/嵌套字段）。
- **多语言（Multi-locale）** —— 每个项目可配置多种语言及默认语言，内容条目之间可建立翻译关联。

**内容生命周期**
- 草稿 / 发布 / 取消发布状态；软删除（回收站）支持恢复与彻底删除。
- **版本历史（Versioning）** —— 每个内容条目保留历史版本，支持标签、差异查看与一键回滚（可配置每条目版本数上限）。
- **翻译** —— 跨语言关联条目、一键创建翻译，并支持 AI 翻译。
- 批量新增 / 更新 / 删除，JSON 导入导出，条目复制，搜索与关联选择器。

**素材库（Assets）**
- 中央媒体库（网格/表格视图），支持裁剪、元数据（alt、标题、说明、作者、版权）以及全站引用追踪。
- 经典上传到本地磁盘，或使用 S3 兼容存储的**预签名直传 / 分片上传**（`ASSET_DIRECT_UPLOAD=true`）。

**访问控制**
- 管理后台完整的**用户 / 角色 / 权限**管理（基于 Spatie Laravel Permission）。
- 项目级**成员**与 API 访问设置。

**无头 API**
- REST API 按项目隔离（通过 `project-id` 请求头），支持 API Token、按 Token 授予能力（`read` / `create` / `update` / `delete` / `admin` / `introspect`）、限流，且每个接口均带有 OpenAPI 注解。

**终端用户认证（Project Auth）**
- 为你所构建的前端应用提供 OAuth 风格的认证：认证客户端与授权码、JWT 访问/刷新令牌、会话管理、邮箱验证、API Key（`uak_…`）以及完整审计日志。

**Webhook**
- 按项目（可选按集合）配置出站 Webhook，带投递日志、重试机制与 SSRF 防护（`WEBHOOK_ALLOW_INSECURE_HTTP`）。

**AI**
- **Elmapi 助手（Elmapi Assistant）** —— 应用内 AI 对话，可直接操作你的项目（创建项目/集合/字段、管理内容、导航、搜索）。
- 编辑器内 AI 内容生成、跨语言 AI 翻译。
- 提供商无关：支持 OpenAI / Anthropic / Gemini（在 设置 → AI 中配置）。

**模板与主题**
- 可将某个集合或整个项目保存为**模板**（JSON）并复用；Seeder 内置了示例模板。
- 品牌与主题设置（应用名称、字体、圆角、预设），支持浅色/深色外观。

---

## 技术栈

| 层次 | 技术 |
|---|---|
| 后端 | PHP 8.4+、**Laravel 13**、Laravel Sanctum、Spatie Laravel Permission、Intervention Image、swagger-php、Laravel AI |
| 前端 | **React 19**、TypeScript、**Inertia.js 2**、**Tailwind CSS 4**、Vite 6、Radix UI、Lexical/MDXEditor、Zod、react-hook-form、Recharts、Excalidraw |
| 数据库 | SQLite（默认）或 MySQL |
| 队列 / 缓存 / 会话 | 默认使用数据库驱动（见 `.env.example`） |
| 测试 | Pest PHP 4（+ PHPUnit） |
| 代码质量 | Laravel Pint、ESLint 9、Prettier、`tsc --noEmit` |

---

## 环境要求

- **PHP 8.4+**（含 Laravel 常用扩展）
- **Composer** 2.x
- **Node.js 20+** 与 **npm**（Vite 6 要求）
- 数据库：SQLite（零配置，默认）或 MySQL
- 可选：AWS S3 / S3 兼容存储（用于直传）、AI 功能所需的各提供商 API Key

---

## 安装（本地开发）

### 1. 安装后端与前端依赖

```bash
cd elmapicms

composer install
npm install
```

### 2. 配置环境

```bash
cp .env.example .env
php artisan key:generate
```

默认的 `.env.example` 已为本地开发（SQLite）配置好，无需填写数据库账号。

### 3. 创建数据库并填充种子数据

```bash
php artisan migrate
php artisan db:seed
```

> 使用 SQLite 时，`migrate` 会自动创建 `database/database.sqlite`（Composer 安装后脚本也会自动创建）。使用 MySQL 时，请先在 `.env` 中配置 `DB_*` 变量。

Seeder 会创建：

- 默认**超级管理员**账号：`admin@admin.com` / `password`
- 角色：**Super Admin**（超级管理员）、**Project Admin**（项目管理员）、**Content Editor**（内容编辑）
- 全部权限，以及示例集合/项目模板。

> ⚠️ 在共享/生产环境使用前，请务必修改默认管理员密码。

### 4. 构建或启动前端

生产构建（一次性）：

```bash
npm run build
```

开发模式（Vite 热更新）：

```bash
npm run dev
```

### 5. 启动应用

```bash
php artisan serve
```

浏览器打开 **http://localhost:8000**，使用 `admin@admin.com` / `password` 登录。

### 一键开发命令

```bash
composer run dev
```

会同时启动：`php artisan serve` + `php artisan queue:listen --tries=1` + `php artisan pail`（日志追踪）+ `npm run dev`。

### 队列 Worker

应用默认使用数据库队列。Webhook、AI、图片处理等依赖队列任务，需要时请运行：

```bash
php artisan queue:listen
```

---

## 快速上手

1. 在仪表盘**创建项目**（填写名称、选择默认语言）。
2. 在 *项目 → 设置 → 本地化* 中**添加语言**（如 `en`、`de`、`zh-CN`）。
3. **创建集合**（如 `posts`、`products`）并**添加字段**（文本、富文本、素材、关联等）。
4. **添加内容** —— 创建条目、保存草稿、发布、翻译。
5. **开放 API** —— 在 *设置 → API 访问* 中开启公共 API 并创建 **API Token**。
6. 通过 REST API（见下节）在任意前端消费内容，或直接导入 `elmapicms-templates/` 中的 Starter 模板。

实用技巧：可将集合/项目保存为**模板**以便复用结构；也可以直接用 **Elmapi 助手** 通过对话创建项目/内容结构。

---

## 无头 REST API

公共 API 位于 `/api` 下，每次请求需要携带两个头：

| 请求头 | 值 |
|---|---|
| `project-id` | 项目 **UUID**（在项目设置中可见） |
| `Authorization` | `Bearer <api-token>`（在 *设置 → API 访问* 中创建） |

示例：

```bash
curl "https://cms.example.com/api/posts" \
  -H "project-id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <api-token>"
```

**主要资源分组**（所有控制器均带 OpenAPI 注解）：

| 分组 | 接口示例 |
|---|---|
| 项目 | `GET /api` —— 项目信息 |
| 项目配置 | `POST /api/project/locales`、`PUT /api/project/locales/default`、`DELETE /api/project/locales/{locale}` |
| 认证 | `POST /api/auth/signup`、`POST /api/auth/login`、`POST /api/auth/refresh`、`POST /api/auth/logout`、`GET /api/auth/me`、`POST /api/auth/change-password`、API Key 管理 |
| 集合 | `GET /api/collections`、`GET /api/collections/{collection}`（管理端：增删改、排序、字段 CRUD） |
| 内容 | `GET/POST /api/{collection}`、`GET/PUT/PATCH/DELETE /api/{collection}/{uuid}`、发布/取消发布/丢弃草稿、翻译关联、版本（`/versions`）、批量接口 |
| 素材 | `GET /api/files`、`POST /api/files`、`POST /api/files/bulk/upload`、直传/分片上传、`GET/DELETE /api/files/{identifier}` |
| Webhook | `GET/POST /api/webhooks`、投递日志 |

**能力（Abilities）**：Token 携带能力，由 `project.ability` 中间件强制校验 —— `read`、`create`、`update`、`delete`、`admin`、`introspect`（用于 API Key 自检）。

**限流**：API 分组默认限流（`API_RATE_LIMIT_PER_MINUTE`，默认 300 次/分钟），认证接口另有独立限流。

---

## 终端用户认证（Project Auth）

在 *项目 → 设置 → Auth* 中，可以为**你所构建的前端应用的终端用户**（而非 CMS 管理员）启用认证：

- 认证客户端与授权码（OAuth 风格流程）
- JWT 访问令牌 + 刷新令牌（TTL 可配置）
- 用户会话（列表查看与吊销）、邮箱验证、账号停用
- API Key（`uak_…`）用于服务端到服务端的调用
- 认证事件的**审计日志**

相关环境变量：`PROJECT_AUTH_ISSUER`、`PROJECT_AUTH_ACCESS_TOKEN_TTL_MINUTES`、`PROJECT_AUTH_REFRESH_TOKEN_TTL_DAYS`、`PROJECT_AUTH_ENABLE_PASSWORD_GRANT`。

---

## AI 功能

1. **设置 → AI** —— 配置各提供商 API Key（OpenAI、Anthropic、Gemini）。
2. **Elmapi 助手** —— 应用内 AI 对话，通过工具操作数据：`CreateProject`、`CreateSchema`、`ManageContent`、`ManageProject`、`ManageSchema`、`NavigateTo`、`SearchProjects`。
3. **内容生成** —— 在编辑器中生成/改写内容。
4. **AI 翻译** —— 将条目一键翻译到其他语言。

---

## Webhook

出站 Webhook 可将内容变更通知到你的服务。在 *项目 → 设置 → Webhooks* 中配置：

- 目标 URL、密钥、要发送的事件（可选按集合限定）
- 每个 Webhook 的投递**日志**（请求/响应体、状态码），支持分页
- 通过队列实现重试
- SSRF 防护：默认仅允许 HTTPS；`WEBHOOK_ALLOW_INSECURE_HTTP=true` 可放开（仅限开发环境）

---

## 前端模板（elmapicms-templates）

`elmapicms-templates/` 文件夹包含可直接上线的 Starter 模板，用于消费 Elmapi 项目内容：

- **Next.js**：`nextjs-meridian-studio`（创意机构）、`nextjs-atlas-group`（多语言官网+博客）、`nextjs-northline-academy`（会员学习平台）、`nextjs-sable-goods`（电商店铺）、`nextjs-ridgeform`（工程承包商）、`nextjs-docs`（文档站）
- **Nuxt**：`nuxt-cove`（SaaS 营销站）、`nuxt-docs`
- **Astro**：`astro-marrow`（餐厅）、`astro-docs`
- **basic-starters/** —— 极简 Next.js / Nuxt / Astro 参考项目，演示 API 对接、BFF 写入、i18n 与终端用户认证

每个模板都是独立应用，请参阅其各自的 `README.md` 与 `.env.example`（典型变量：`ELMAPI_BASE_URL`、`ELMAPI_PROJECT_ID`、`ELMAPI_API_KEY`）。

---

## 网页安装器（elmapicms-installer）

适用于没有命令行权限的共享主机：

1. 将 `elmapicms-installer/` 的内容上传到 Web 根目录。
2. 浏览器访问 `install.php`。
3. 安装器会检查服务器环境要求、写入 `.env`（`EnvWriter`）、修复路径（`PathFixer`/`PathResolver`）、执行数据库迁移，并在完成后自动清理（`Cleanup`）。

它是同一个 `elmapicms` 应用的打包分发版本，已内置构建好的前端资源（`public/build`）。

---

## 环境变量

`.env.example` 中的关键变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `APP_NAME` | `ElmapiCMS 4.0` | 应用名称 |
| `APP_URL` | `http://localhost` | 公开基础 URL |
| `APP_VERSION` | `4.0.0` | 应用内展示的版本号 |
| `DB_CONNECTION` | `sqlite` | `sqlite` 或 `mysql` |
| `MAX_FILE_SIZE` | `2M` | 经典上传的大小上限 |
| `ASSET_DIRECT_UPLOAD` | `false` | 开启预签名直传/分片上传（需要 S3 磁盘 + 存储桶 CORS） |
| `AWS_*` | — | `s3` 磁盘所需的 AWS 凭证 |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | — | AI 提供商密钥（设置 → AI） |
| `WEBHOOK_ALLOW_INSECURE_HTTP` | `false` | 允许非 HTTPS 的 Webhook 目标（仅开发） |
| `WEBHOOK_LOG_RESPONSE_BODY_MAX_BYTES` | `8192` | Webhook 日志响应体大小上限 |
| `CONTENT_VERSIONS_PER_ENTRY` | `-1` | 每条目版本历史上限（`-1` = 不限） |
| `API_RATE_LIMIT_PER_MINUTE` | `300` | 主 `/api` 限流 |
| `PROJECT_AUTH_*` | — | 终端用户认证设置（TTL、issuer、密码授权） |
| `SESSION_DRIVER` / `CACHE_STORE` / `QUEUE_CONNECTION` | `database` | 驱动（SQLite 友好的默认值） |

---

## 测试与代码质量

运行测试套件（Pest）：

```bash
composer test          # 或：php artisan test --compact
```

只跑部分测试：

```bash
php artisan test --compact --filter=ProjectCreationTest
```

代码质量工具：

```bash
vendor/bin/pint --dirty     # 格式化改动的 PHP 文件
npm run lint                # ESLint（自动修复）
npm run format              # Prettier（resources/）
npm run types               # tsc --noEmit
```

---

## 部署说明

- 按标准 Laravel 方式部署：`composer install --no-dev --optimize-autoloader`、`npm run build`、`php artisan migrate --force`、`php artisan config:cache` / `route:cache`，并常驻队列 Worker（Webhook、AI、图片处理需要）。
- 站点根目录指向 `elmapicms/public/`（共享主机则使用安装器包）。
- 生产环境建议使用 MySQL；设置 `APP_ENV=production`、`APP_DEBUG=false`。
- API Token 只能在服务端保存，切勿放入浏览器端打包产物（参见模板 README）。
