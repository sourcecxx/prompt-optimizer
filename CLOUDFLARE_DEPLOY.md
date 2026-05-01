Prompt Optimizer 部署到 Cloudflare Pages 指南
==============================================

项目是一个纯前端 Vue 3 + TypeScript 应用，使用 Vite 构建。LLM API 调用直接在浏览器端完成（通过 VITE_* 环境变量注入），不需要后端服务器。因此可以完美部署到 Cloudflare Pages（静态站点托管）。


方法一：通过 GitHub 自动部署（推荐）
------------------------------------

1. Fork 本项目到你的 GitHub 账号（已完成）

2. 登录 https://dash.cloudflare.com，进入 "Pages" > "Create a project"

3. 选择 "Connect to Git"

4. 授权 Cloudflare 访问你的 GitHub 账号，然后选择 prompt-optimizer 仓库

5. 配置构建设置：

   Build settings:
     Framework preset: Vite
     Build command: pnpm build
     Build output directory: packages/web/dist
     Root directory: . (留空或填 .)

6. Environment variables（在 "Production" 环境变量的 Section 添加）：

   可选，根据你使用的 LLM 服务填写：
     VITE_OPENAI_API_KEY = your-key
     VITE_GEMINI_API_KEY = your-key
     VITE_ANTHROPIC_API_KEY = your-key
     VITE_DEEPSEEK_API_KEY = your-key
     VITE_SILICONFLOW_API_KEY = your-key
     VITE_ZHIPU_API_KEY = your-key
     VITE_CUSTOM_API_KEY = your-key
     VITE_CUSTOM_API_BASE_URL = https://your-api.com/v1
     VITE_CUSTOM_API_MODEL = your-model

   可选访问密码保护：
     ACCESS_PASSWORD = your-password

7. 点击 "Save and Deploy"

8. Cloudflare Pages 会自动构建并部署你的站点。首次部署可能需要几分钟。


方法二：手动部署（通过 wrangler CLI）
------------------------------------

1. 安装 wrangler:
   npm install -g wrangler

2. 登录:
   wrangler login

3. 创建 wrangler.toml 文件（项目根目录），内容如下：

   [site]
   bucket = "./packages/web/dist"
   entry-point = "."

4. 先构建项目:
   pnpm build

5. 部署到 Cloudflare Pages:
   wrangler pages deploy packages/web/dist \
     --project-name=prompt-optimizer \
     --branch=main

6. （可选）设置环境变量:
   wrangler pages secret put VITE_OPENAI_API_KEY
   wrangler pages secret put ACCESS_PASSWORD


方法三：通过 Cloudflare Workers + Pages 混合部署（支持 API 代理）
-----------------------------------------------------------------

如果你的 LLM API 有 CORS 限制，可以创建一个 Cloudflare Worker 来代理 API 请求。

1. 在 api/ 目录下创建 cloudflare-worker.js:

   export default {
     async fetch(request, env) {
       const url = new URL(request.url);

       // OpenAI 兼容 API 代理
       if (url.pathname.startsWith('/api/openai')) {
         const targetUrl = `https://api.openai.com${url.pathname.replace('/api/openai', '')}`;
         return fetch(targetUrl, {
           method: request.method,
           headers: {
             'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
             'Content-Type': 'application/json',
           },
           body: request.body,
         });
       }

       // Gemini API 代理
       if (url.pathname.startsWith('/api/gemini')) {
         const model = url.pathname.split('/')[3];
         const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
         return fetch(targetUrl, {
           method: request.method,
           headers: {'Content-Type': 'application/json'},
           body: request.body,
         });
       }

       // 默认返回 404
       return new Response('Not Found', { status: 404 });
     },
   };

2. 在 Cloudflare Pages 的 "Functions" Section 中启用 Worker 函数。


环境变量说明
-----------

所有 VITE_* 前缀的环境变量会在构建时被注入到前端代码中，部署后可以直接在浏览器端使用。

支持的 LLM 提供商：
  - OpenAI (GPT-4, GPT-3.5-turbo)
  - Google Gemini
  - Anthropic Claude
  - DeepSeek
  - SiliconFlow
  - 智谱 AI (Zhipu)
  - 阿里百炼 (DashScope)
  - OpenRouter
  - ModelScope (魔搭)
  - MiniMax
  - Cloudflare Workers AI
  - 自定义 API（兼容 OpenAI 格式，如 Ollama）

访问密码保护：
  ACCESS_PASSWORD — 设置后访问 Web 界面需要输入密码。
                    部署到 CF Pages 时，需要在 middleware.js 中修改认证逻辑为
                    读取构建时环境变量，或使用 Cloudflare KV 存储。


注意事项
-------

1. API Key 大小写敏感：确保在 Cloudflare Pages 的 Environment Variables 中使用
   正确的变量名（VITE_ 前缀）。

2. CORS 问题：大多数 LLM API（OpenAI、Gemini 等）支持浏览器直接调用，无需代理。
   如果遇到 CORS 限制，使用方法三的 Worker 代理方案。

3. 构建时注入 vs 运行时注入：
   - Vite 在构建时将 VITE_* 环境变量编译到代码中
   - Cloudflare Pages 的 Environment Variables 在构建时可用
   - 因此部署后修改 API Key 需要重新构建和部署

4. 自定义模型配置：使用 VITE_CUSTOM_API_KEY_<suffix> 格式可以配置多个自定义模型。
   例如：VITE_CUSTOM_API_KEY_qwen3、VITE_CUSTOM_API_BASE_URL_qwen3 等。

5. Cloudflare Pages 免费额度：每月 100GB 带宽，足够个人使用。


快速验证部署是否成功
-------------------

部署完成后，访问你的 Cloudflare Pages URL（如 https://prompt-optimizer.yourname.pages.dev）：

1. 页面应该正常加载
2. 在设置中配置一个 LLM API Key
3. 尝试优化一个提示词，确认 API 调用正常工作
4. 如果设置了 ACCESS_PASSWORD，登录页面应该出现
