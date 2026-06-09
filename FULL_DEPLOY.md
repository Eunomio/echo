# 完整部署说明：React 前端 + FastAPI 后端

Streamlit 版本只适合快速演示核心功能。若要线上界面与本地 React 版本一致，请使用双服务部署：

- 前端：Vercel，部署 `frontend/`
- 后端：Render，部署 `backend/`

## 1. 部署后端到 Render

1. 打开 Render，选择 New Blueprint。
2. 连接 GitHub 仓库 `Eunomio/echo`。
3. Render 会读取仓库根目录的 `render.yaml`，创建 `echo-api` Web Service。
4. 在 Render 的环境变量中填写：

```text
DEEPSEEK_API_KEY=你的 DeepSeek API Key
LLM_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
CORS_ORIGINS=https://你的-vercel-前端域名.vercel.app
```

如果使用 OpenAI：

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=你的 OpenAI API Key
OPENAI_MODEL=gpt-4o-mini
CORS_ORIGINS=https://你的-vercel-前端域名.vercel.app
```

后端启动命令由 `render.yaml` 提供：

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

部署完成后，记录 Render 后端地址，例如：

```text
https://echo-api.onrender.com
```

健康检查地址应能打开：

```text
https://echo-api.onrender.com/api/health
```

## 2. 部署前端到 Vercel

1. 打开 Vercel，新建 Project。
2. 导入 GitHub 仓库 `Eunomio/echo`。
3. 推荐 Root Directory 选择：

```text
frontend
```

也可以保持仓库根目录不变；仓库根目录的 `vercel.json` 已经配置为进入 `frontend` 构建。

4. Framework Preset 选择 Vite。
5. Build Command 保持：

```text
npm run build
```

6. Output Directory 保持：

```text
dist
```

7. 在 Vercel 环境变量中添加：

```text
VITE_API_BASE_URL=https://echo-api.onrender.com/api
```

注意替换成你自己的 Render 后端域名。

如果部署后出现 `404: NOT_FOUND`，优先检查：

- Vercel 的 Root Directory 是否设置为 `frontend`，或确认仓库根目录的 `vercel.json` 已在最新提交中。
- Output Directory 是否为 `dist`（Root Directory 为 `frontend` 时）或 `frontend/dist`（Root Directory 为仓库根目录时）。
- 最新代码是否包含 Vite SPA rewrite：`/(.*)` -> `/index.html`。

## 3. 回填 CORS

Vercel 部署完成后，会得到前端域名，例如：

```text
https://echo.vercel.app
```

回到 Render 的 `echo-api` 环境变量，把 `CORS_ORIGINS` 改成这个前端域名：

```text
CORS_ORIGINS=https://echo.vercel.app
```

如果你还有本地调试需求，可以临时写成逗号分隔：

```text
CORS_ORIGINS=http://localhost:5173,https://echo.vercel.app
```

## 4. 本地运行仍然不变

后端：

```powershell
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

本地前端默认仍连接：

```text
http://localhost:8000/api
```

如果需要指定其他 API 地址，在 `frontend/.env.local` 中写：

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

## 5. 重要限制

当前后端默认使用 SQLite。Render 免费实例的文件系统可能不会长期持久保存用户历史记录；如果要正式长期上线，建议后续改成 PostgreSQL，并把 `DATABASE_URL` 设置为 PostgreSQL 连接串。
