# Streamlit 部署说明

这个仓库原本是 React + FastAPI 双服务项目。Streamlit Community Cloud 通常只启动一个 Python 入口，因此这里新增了 `streamlit_app.py`，复用 `backend/llm_service.py` 和 `backend/prompt_templates.py`，用于公开网页部署。

## 本地预览

```powershell
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## 部署到 Streamlit Community Cloud

1. 确认代码已推送到 GitHub 仓库 `Eunomio/echo`。
2. 打开 Streamlit Community Cloud，新建应用。
3. Repository 选择 `Eunomio/echo`。
4. Branch 选择 `main`。
5. Main file path 填写：

```text
streamlit_app.py
```

6. Advanced settings 里添加 Secrets，例如：

```toml
LLM_PROVIDER = "deepseek"
DEEPSEEK_API_KEY = "你的 DeepSeek API Key"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"
```

如果使用 OpenAI：

```toml
LLM_PROVIDER = "openai"
OPENAI_API_KEY = "你的 OpenAI API Key"
OPENAI_MODEL = "gpt-4o-mini"
```

## 版本差异

Streamlit 版保留了核心可演示能力：

- 情景复盘
- 情绪与认知偏差识别
- 苏格拉底式 CBT 引导
- 社交模拟
- “不知道怎么回？”建议
- 本次训练报告

与本地 React + FastAPI 版相比，Streamlit Community Cloud 版默认不使用 SQLite 持久化历史记录；对话记录保存在当前浏览器会话中。这样部署更简单，也避免公开部署时误保存用户隐私输入。
