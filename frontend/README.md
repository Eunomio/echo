# 未必 MAYBE 前端

> 另一种解读，另一种可能。

React 19 + Vite 8 的应用界面，包含情景复盘、社交模拟、成长记录和历史记录。侧栏底部使用英文 slogan：Another perspective. Another possibility.

## 开发

建议使用 Node.js 24。在此目录执行：

```powershell
npm.cmd ci
npm.cmd run dev
```

同时在 `backend` 目录启动 FastAPI，监听 8000 端口。Vite 将 `/api` 转发到 `http://localhost:8000`。前端页面通常为 `http://localhost:5173`；端口占用时以终端输出为准。

macOS/Linux 使用 `npm`。完整的后端安装及密钥配置见[项目 README](../README.md)。

## 构建与检查

```powershell
npm.cmd run lint
npm.cmd run build
```

构建输出位于 `dist/`。`npm.cmd run preview` 用于查看构建后的页面，本地完整交互请使用开发服务及其 `/api` 代理。

## 界面与配置

- `src/App.jsx`：页面、对话状态、中文与英文 slogan、使用提示。
- `src/index.css`：暖白与绿色主题、深色主题、手机布局及文字样式。
- `src/services/api.js`：请求与流式消息处理；默认地址为 `/api`。
- `src/components/GrowthInsight.jsx`：综合成长回顾、建议、参考练习入口及更新状态。
- `src/utils/emotionLabels.js`：情绪名称的中文展示与旧标签兼容。
- `public/maybe-logo.png`：包含“未必 MAYBE”文字的完整 Logo。
- `public/maybe-mark.png`：图形 Logo，同时用于浏览器图标。
- `.env.example`：可选的 `VITE_API_BASE_URL` 和备案号配置。前端环境变量会随构建公开，请只填写公开配置。

Docker 部署使用同一域名提供页面和 `/api`。会话删除通过 `POST /api/conversations/{id}/delete`，以兼容魔搭托管网关。
