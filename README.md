# Echo — AI 社交焦虑认知训练与复盘系统

**Echo** 是一款基于认知行为疗法（CBT）心理学框架的社交焦虑辅助训练系统。它通过苏格拉底式提问引导、真实社交情景模拟以及即时的认知偏差检测，帮助用户识别、重构消极思维模式，并在安全的虚拟环境中锻炼社交技能。

---

## 🛠️ 技术栈

*   **前端**：React 19 + Vite 8 + CSS + React-Markdown (UI 支持高动态毛玻璃、深色夜间模式、自适应布局与录音交互)
*   **后端**：FastAPI + SQLAlchemy + SQLite + LLM API (支持自动化情绪分析与苏格拉底回复生成)

---

## 🚀 本地运行指南

要启动并在本地运行该系统，需要分别启动**后端服务**和**前端开发服务器**。

如果希望快速部署到 Streamlit Community Cloud，让别人直接体验核心功能，可使用仓库根目录的 `streamlit_app.py` 单体入口。详细步骤见 [STREAMLIT_DEPLOY.md](STREAMLIT_DEPLOY.md)。

如果希望线上界面与本地 React 版本保持一致，请部署 React 前端 + FastAPI 后端双服务。详细步骤见 [FULL_DEPLOY.md](FULL_DEPLOY.md)。

### 前提条件
安装并配置好：
*   **Python 3.9+**
*   **Node.js 18+**

---

### 1. 启动后端服务 (FastAPI)

1.  打开终端，进入 `backend` 目录：
    ```bash
    cd backend
    ```
2.  创建并激活 Python 虚拟环境：
    ```powershell
    # Windows PowerShell
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1

    # macOS/Linux
    python3 -m venv .venv
    source .venv/bin/activate
    ```
3.  安装依赖库：
    ```bash
    pip install -r requirements.txt
    ```
4.  配置环境变量：
    *   在 `backend` 目录下，将 `.env.example` 重命名为 `.env`。
    *   在 `.env` 中填入你的大模型 API Key 以及对应的 URL 接口：
        ```env
        DEEPSEEK_API_KEY="your_api_key_here"
        DEEPSEEK_API_URL="https://api.deepseek.com/v1" # 或其他 OpenAI 兼容的接口
        ```
5.  启动 FastAPI 服务：
    ```bash
    uvicorn main:app --reload
    ```
    *   **后端接口地址**：[http://localhost:8000](http://localhost:8000)
    *   **交互式 API 文档 (Swagger UI)**：[http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. 启动前端服务 (React + Vite)

1.  打开一个新的终端，进入 `frontend` 目录：
    ```bash
    cd frontend
    ```
2.  安装 Node 依赖包：
    ```bash
    npm install
    ```
3.  启动 Vite 开发服务器：
    ```bash
    npm run dev
    ```
    *   **前端访问地址**：[http://localhost:5173](http://localhost:5173)

---

## 🎯 核心功能一览

1.  **情景复盘**：描述你最近在社交中感到焦虑的真实困扰，AI 会运用**苏格拉底式提问**（Socratic Coaching）逐步启发你，并自动检测其中的 6 大经典**认知偏差**（如读心术、灾难化、非黑即白等）。
2.  **社交模拟**：提供“社团面试”、“和暗恋对象打招呼”、“去室友聚餐”等多样化社交场景，在对话过程中可随时点击 **“怎么办？”** 呼出场外求助，AI 会根据犹豫原因给出心理学建议并一键填入。
3.  **成长记录（原成长图谱）**：图表化展示你的累计训练次数、情绪觉察统计，并带有**详尽的认知偏差心理学定义与科学解释**。
4.  **历史记录与精细化复盘**：
    *   支持随时查看过往对话，像翻阅“微信聊天记录”一样以只读形式复盘字里行间的心理变化。
    *   每次结束对话会自动触发 **AI 综合社交打分（0-100分）** 并生成排版精美的 **Markdown 分析报告**。
    *   支持对未生成报告的历史记录补建报告，并支持二次确认删除记录。
5.  **高动态状态进阶**：左下角状态卡片会实时绑定你的训练总量，按 **“🌱破土萌芽 &rarr; 🌿茁壮成长 &rarr; 🌳枝繁叶茂 &rarr; 🌟社交达人”** 梯级进阶，记录你的蜕变。
