<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ElmapiCMS — Headless CMS</title>
    <meta name="description" content="ElmapiCMS：API 驱动的现代化无头内容管理系统（Headless CMS）。">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 1.5rem;
            line-height: 1.6;
        }
        .card {
            max-width: 720px;
            width: 100%;
            text-align: center;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 3.5rem 2.5rem;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }
        .logo {
            width: 72px;
            height: 72px;
            margin: 0 auto 1.5rem;
            display: block;
        }
        h1 {
            font-size: 2.2rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: #ffffff;
            margin-bottom: 0.5rem;
        }
        .tagline {
            font-size: 1.05rem;
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .desc {
            text-align: left;
            font-size: 0.98rem;
            color: #cbd5e1;
            margin-bottom: 2.2rem;
        }
        .desc ul {
            list-style: none;
            margin-top: 1rem;
        }
        .desc li {
            padding: 0.45rem 0;
            padding-left: 1.6rem;
            position: relative;
        }
        .desc li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #34d399;
            font-weight: 700;
        }
        .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn {
            display: inline-block;
            padding: 0.75rem 2rem;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.15s ease;
        }
        .btn-primary {
            background: #6366f1;
            color: #ffffff;
        }
        .btn-primary:hover { background: #4f46e5; }
        .btn-ghost {
            background: transparent;
            color: #94a3b8;
            border: 1px solid #475569;
        }
        .btn-ghost:hover { color: #e2e8f0; border-color: #64748b; }
        .footer {
            margin-top: 2.2rem;
            font-size: 0.82rem;
            color: #64748b;
        }
        @media (max-width: 520px) {
            .card { padding: 2.5rem 1.5rem; }
            h1 { font-size: 1.7rem; }
            .actions { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="card">
        <img class="logo" src="/logo.svg" alt="ElmapiCMS">
        <h1>ElmapiCMS</h1>
        <p class="tagline">Headless CMS · 无头内容管理系统</p>
        <div class="desc">
            <p>ElmapiCMS 是一个 API 驱动的现代内容管理平台：在后台创建项目、集合与内容，通过公开 API 将内容输出到任意前端——无论是 Next.js、Nuxt、Astro，还是你自己的网站。</p>
            <ul>
                <li>项目管理：多项目、多集合、多语言</li>
                <li>内容创作：文本、富文本、媒体、关系字段</li>
                <li>公开 API：RESTful 接口，前端自由取数</li>
                <li>团队协作：用户、角色、权限管理</li>
            </ul>
        </div>
        <div class="footer">ElmapiCMS 4.0</div>
    </div>
</body>
</html>
