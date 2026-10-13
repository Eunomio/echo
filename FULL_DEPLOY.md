# 完整部署说明：React 前端 + FastAPI 后端

## 比赛展示：魔搭 ModelScope 创空间

当前空间：[未必 MAYBE](https://www.modelscope.cn/studios/Eunomio/Maybe?mode=full)，使用 Docker 和免费 CPU `platform/2v-cpu-8g-mem`。应用地址为 `https://eunomio-maybe.ms.show/`，校内模型通过后端调用。

品牌文案为“另一种解读，另一种可能。”，侧栏为“Another perspective. Another possibility.”。魔搭的全屏分享页在手机上可能保持桌面宽度，比赛展示建议用电脑并提前测试现场网络。

希望上传代码后直接获得展示入口，可以优先使用魔搭创空间的 Docker 类型。根目录 `Dockerfile` 将当前 React 界面和 FastAPI 后端构建为一个应用，监听 `0.0.0.0:7860`。浏览器通过同一地址访问页面和 `/api`，保留情景复盘、社交模拟、求助、成长及历史记录功能。

1. 登录 [魔搭创空间](https://modelscope.cn/studios)，完成平台要求的阿里云账号绑定和实名认证。
2. 创建 Docker 类型的创空间，先确认当前账号有可用的免费 CPU 资源。`ms_deploy.json` 提供平台 CPU 规格的配置候选，实际资源选择应以账号当前可用列表为准；不要自动切换到付费规格。
3. 将根目录 `Dockerfile`、`.dockerignore`、`ms_deploy.json` 以及 `backend/`、`frontend/` 和 `deploy/start-studio.py` 上传到空间。上传时排除本地 `.env`、密钥、数据库、`node_modules/`、`.venv/` 和 `dist/`。`.dockerignore` 只控制镜像构建内容，不能代替上传或 Git 提交前的排除检查。
4. 当前使用校内服务：在空间的密钥设置中配置 `OPENAI_API_KEY`，在环境变量中配置 `LLM_PROVIDER=openai`、`OPENAI_BASE_URL=https://chat.ecnu.edu.cn/open/api/v1` 和 `OPENAI_MODEL=ecnu-max`。其他服务可按实际供应商调整。不要把真实密钥写进代码或 `ms_deploy.json`。
5. 等待构建完成，使用平台实际提供的分享入口验证页面、聊天、求助和报告，并用关闭代理的现场网络测试。公开与私有访问方式在发布前按演示需要选择。

创空间 SQLite 使用 `/mnt/workspace/maybe/maybe.db`。应在目标空间验证持久化挂载和重启后的历史记录；空间迁移、重命名或配额变化也可能影响数据及可用性。免费资源用于比赛展示时，提前检查到期时间并在比赛前打开空间验证。模型 API 调用另行计费。

官方 Docker 要求见 [魔搭 Docker 创空间文档](https://modelscope.cn/docs/studios/docker) 和 [魔搭官方部署说明](https://modelscope.cn/skills/modelscope/modelscope-studio)。

需要通过平台接口代部署时，在 [魔搭访问令牌页面](https://modelscope.cn/my/myaccesstoken) 创建具有创空间写入权限的令牌。在本机项目目录运行 `powershell -ExecutionPolicy Bypass -File .\deploy\configure-modelscope.ps1`，在隐藏输入中粘贴令牌。脚本保存为 `deploy/modelscope.env` 并限制文件访问权限；该文件已被 Git 和 Docker 排除，也不包含在准备好的上传包中。不要把令牌粘贴到聊天或提交到仓库，部署完成后可在平台撤销该专用令牌。

## 国内云服务器部署：未必 MAYBE

仓库提供 `compose.yaml`，可以把 React 页面、FastAPI 和 SQLite 部署到同一台 Linux 服务器。浏览器只访问一个域名，`/api` 请求由 Caddy 转发到后端，聊天流式回复即时转发；数据库和 HTTPS 证书保存在独立 Docker 数据卷中。

### 上线前准备

- 阿里云中国内地轻量应用服务器或 ECS，建议至少 2 GB 内存，安装 Docker Engine 和 Docker Compose。
- 一个已实名认证并完成备案的域名。中国内地网站应在备案通过后开放访问；免费试用 ECS 不能直接申请备案服务码，轻量应用服务器申请备案服务号需要累计购买至少 3 个月。具体规则见 [阿里云备案准备说明](https://help.aliyun.com/zh/icp-filing/basic-icp-service/user-guide/overview) 和 [轻量应用服务器使用须知](https://help.aliyun.com/zh/simple-application-server/product-overview/usage-notes)。
- 可用的校内服务密钥，或配置为 DeepSeek。模型调用费用与服务器、域名费用分开。

服务器规格、活动资格、域名首年价和续费价以账号中的实际订单为准。备案通常需要约 3～22 个工作日，参见 [个人网站备案流程](https://help.aliyun.com/zh/icp-filing/basic-icp-service/getting-started/quick-start-for-icp-filing-for-personal-websites)。

### 1. 上传部署代码

无需让服务器连接 GitHub。可以在本地项目根目录打包，再用 SCP/SFTP 上传到服务器。以下命令排除了本机密钥、数据库和依赖目录：

```bash
tar --exclude=.env --exclude='.env.*' --exclude='*.env' --exclude=secrets.toml --exclude='*.db' --exclude='*.db-*' --exclude=node_modules --exclude=dist --exclude=.venv --exclude=__pycache__ -czf maybe-deploy.tar.gz compose.yaml .dockerignore deploy backend frontend
```

在服务器上新建专用目录，将压缩包上传到该目录后解压。

### 2. 填写服务配置

在解压后的项目目录执行：

```bash
cp deploy/aliyun.env.example deploy/aliyun.env
chmod 600 deploy/aliyun.env
```

编辑 `deploy/aliyun.env`：

```text
SITE_ADDRESS=你的已备案域名
PUBLIC_ORIGIN=https://你的已备案域名
HTTP_PORT=80
HTTPS_PORT=443
LLM_PROVIDER=openai
OPENAI_API_KEY=你的校内服务密钥
OPENAI_BASE_URL=https://chat.ecnu.edu.cn/open/api/v1
OPENAI_MODEL=ecnu-max
VITE_ICP_RECORD=你的实际备案号
```

`SITE_ADDRESS` 只填写域名，例如 `maybe.example.com`；Caddy 会自动申请和续期 HTTPS 证书。服务器的域名解析应指向公网 IP，并在防火墙中放行 80 和 443 端口。后端 8000 端口由 Docker 内网访问，无需对外放行。

使用 DeepSeek 时，在配置中设置 `LLM_PROVIDER=deepseek` 和 `DEEPSEEK_API_KEY`，并按需设置 `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`。

本地验证可以保留 `SITE_ADDRESS=http://localhost`、`PUBLIC_ORIGIN=http://localhost`，通过 localhost 访问。语音输入需要浏览器支持和安全连接，公网访问使用 HTTPS。

### 3. 构建与启动

```bash
docker compose --env-file deploy/aliyun.env config --quiet
docker compose --env-file deploy/aliyun.env up -d --build
docker compose --env-file deploy/aliyun.env ps
```

如果拉取基础镜像失败，在阿里云控制台查询当前可用的官方镜像加速配置，或把 `PYTHON_IMAGE`、`NODE_IMAGE`、`CADDY_IMAGE` 改为你已配置的镜像仓库地址。构建过程中下载依赖，访客打开页面时无需访问 Docker Hub、GitHub 或 Google Fonts。

检查页面和后端：

```bash
curl -f https://你的已备案域名/api/health
```

随后检查一次情景复盘、社交模拟、求助建议、报告和历史记录。用比赛现场的网络或手机流量关闭代理测试，确认真正的访问效果。

### 4. 更新和保存数据

上传更新后的代码，重复 `up -d --build` 即可。修改备案号后需要重新构建 `web`。

`maybe_data` 保存数据库，`caddy_data` 保存证书。`docker compose down` 会停止服务并保留这些数据；不要使用 `down -v`，它会删除数据卷。首次部署创建独立数据库，如需迁移旧记录，应先导出原数据库并核对后再导入。

可在后端容器中创建一致性的 SQLite 备份：

```bash
docker compose --env-file deploy/aliyun.env exec -T backend python -c "import sqlite3, time; dst='/data/backup-'+str(int(time.time()))+'.db'; src=sqlite3.connect('/data/maybe.db'); out=sqlite3.connect(dst); src.backup(out); out.close(); src.close(); print(dst)"
```

根据输出的文件名，用 `docker compose cp backend:/data/文件名 ./文件名` 把备份复制到主机并另存。

## 原有 Render + Vercel 部署

以下内容保留原部署的服务名与地址示例，如 `echo-api`，以便维护已有服务。产品界面与仓库介绍统一使用“未必 MAYBE”；GitHub 仓库路径保持为 `Eunomio/echo`。

Streamlit 版本只适合快速演示核心功能。若要线上界面与本地 React 版本一致，请使用双服务部署：

- 前端：Vercel，部署 `frontend/`
- 后端：Render，部署 `backend/`

## 1. 部署后端到 Render

1. 打开 Render，选择 New Blueprint。
2. 连接 GitHub 仓库 `Eunomio/echo`。
3. Render 会读取仓库根目录的 `render.yaml`，创建 `echo-api` Web Service。
4. 在 Render 的环境变量中填写：

```text
PYTHON_VERSION=3.11
DEEPSEEK_API_KEY=你的 DeepSeek API Key
LLM_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
CORS_ORIGINS=https://你的-vercel-前端域名.vercel.app
```

如果使用 OpenAI：

```text
PYTHON_VERSION=3.11
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

本地前端默认请求 `/api`，由 Vite 转发到：

```text
http://localhost:8000/api
```

如果需要指定其他 API 地址，在 `frontend/.env.local` 中写：

```text
VITE_API_BASE_URL=http://localhost:8000/api
```

## 5. 重要限制

当前后端默认使用 SQLite。Render 免费实例的文件系统可能不会长期持久保存用户历史记录；如果要正式长期上线，建议后续改成 PostgreSQL，并把 `DATABASE_URL` 设置为 PostgreSQL 连接串。

如果 Render 日志显示正在使用 Python 3.14，并在安装 `pydantic-core` 时出现 `maturin failed` 或 `Read-only file system`，说明运行时版本太新。仓库已提供 `.python-version`，同时也建议在 Render 环境变量中显式设置：

```text
PYTHON_VERSION=3.11
```

修改后使用 **Manual Deploy -> Clear build cache & deploy**，避免旧的 Python 3.14 构建缓存继续生效。
