# 未必 MAYBE · Streamlit 备用部署

> 另一种解读，另一种可能。

当前比赛展示使用魔搭的 React + FastAPI 完整版本。`streamlit_app.py` 是复用后端对话与提示词的备用入口，界面及记录保存方式与 React 版不同。

## 本地预览

```powershell
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

可以使用项目现有的环境变量，也可以把 `.streamlit/secrets.example.toml` 复制为 `.streamlit/secrets.toml` 并填写密钥；已填写的配置文件不提交到 Git。

## Streamlit Community Cloud

1. 新建应用并选择 GitHub 仓库 `Eunomio/echo`、分支 `main`。
2. Main file path 设置为 `streamlit_app.py`。
3. 在 Secrets 中填写校内服务配置：

```toml
LLM_PROVIDER = "openai"
OPENAI_API_KEY = "你的校内服务密钥"
OPENAI_BASE_URL = "https://chat.ecnu.edu.cn/open/api/v1"
OPENAI_MODEL = "ecnu-max"
```

若使用 DeepSeek，设置 `LLM_PROVIDER = "deepseek"`，并填写 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL = "https://api.deepseek.com"` 和 `DEEPSEEK_MODEL = "deepseek-chat"`。

## 当前功能与差异

提供情景复盘、情绪及思维模式提示、六个社交模拟场景、“怎么办？”回复建议和本次练习报告。页面使用“未必 MAYBE”、中文 slogan，侧栏使用英文 slogan。

记录保存在当前 Streamlit 会话中，默认不使用 React + FastAPI 版本的 SQLite 历史数据库。需要查看完整界面、持久化历史和成长记录时，请使用 [完整部署方案](FULL_DEPLOY.md)。

使用提示：本产品提供社交练习与自我反思支持，不能替代专业心理咨询。如有需要，请寻求专业帮助。
