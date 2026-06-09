"""
Echo Streamlit deployment entry.

This file provides a single-process web UI for Streamlit Community Cloud while
reusing the existing backend prompt and LLM service modules.
"""

import asyncio
import os
import sys
from pathlib import Path

import streamlit as st


ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import prompt_templates as prompts  # noqa: E402


BIAS_LABELS = {
    "mind_reading": "读心倾向",
    "catastrophizing": "灾难化思维",
    "overgeneralization": "过度泛化",
    "personalizing": "自我否定",
    "negative_filtering": "负面过滤",
    "all_or_nothing": "非黑即白",
}


def configure_from_secrets() -> None:
    """Mirror Streamlit secrets into environment variables used by llm_service."""
    try:
        secrets = dict(st.secrets)
    except Exception:
        secrets = {}

    for key in (
        "LLM_PROVIDER",
        "DEEPSEEK_API_KEY",
        "DEEPSEEK_BASE_URL",
        "DEEPSEEK_MODEL",
        "OPENAI_API_KEY",
        "OPENAI_BASE_URL",
        "OPENAI_MODEL",
    ):
        if key in secrets and not os.getenv(key):
            os.environ[key] = str(secrets[key])


def get_llm_service():
    from llm_service import llm_service

    return llm_service


def run_async(coro):
    return asyncio.run(coro)


async def collect_stream(stream):
    chunks = []
    async for chunk in stream:
        chunks.append(chunk)
    return "".join(chunks)


def init_state() -> None:
    defaults = {
        "mode": "review",
        "messages": [],
        "scenario_id": "classmate_borrow",
        "custom_options": {},
        "reports": [],
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def sidebar() -> None:
    st.sidebar.title("Echo")
    st.sidebar.caption("AI 社交焦虑认知训练与复盘系统")

    st.session_state.mode = st.sidebar.radio(
        "训练模式",
        ["review", "simulation"],
        format_func=lambda value: "情景复盘" if value == "review" else "社交模拟",
    )

    if st.session_state.mode == "simulation":
        scenarios = prompts.get_all_scenarios()
        scenario_titles = {item["id"]: f"{item['icon']} {item['title']}" for item in scenarios}
        st.session_state.scenario_id = st.sidebar.selectbox(
            "模拟场景",
            list(scenario_titles.keys()),
            format_func=scenario_titles.get,
            index=list(scenario_titles.keys()).index(st.session_state.scenario_id),
        )

        selected = next(item for item in scenarios if item["id"] == st.session_state.scenario_id)
        custom_options = {}
        for option in selected.get("configurable_options", []):
            custom_options[option["id"]] = st.sidebar.selectbox(option["label"], option["options"])
        st.session_state.custom_options = custom_options

        if st.sidebar.button("载入场景开场白", use_container_width=True):
            opening = prompts.get_simulation_opening(st.session_state.scenario_id)
            st.session_state.messages = [{"role": "assistant", "content": opening}]

    if st.sidebar.button("清空当前对话", use_container_width=True):
        st.session_state.messages = []

    st.sidebar.divider()
    st.sidebar.info("Echo 提供自我觉察与练习支持，不替代专业心理咨询或医学诊断。")


def render_messages() -> None:
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
            emotion = message.get("emotion")
            biases = message.get("biases")
            if emotion:
                st.caption(
                    f"情绪：{emotion.get('emotion', '未知')} · "
                    f"强度：{round(float(emotion.get('intensity', 0)) * 100)}% · "
                    f"焦虑等级：{emotion.get('anxiety_level', '未知')}"
                )
            if biases and biases.get("detected_biases"):
                labels = [
                    BIAS_LABELS.get(item.get("bias_type"), item.get("bias_type", "未知"))
                    for item in biases["detected_biases"]
                ]
                st.caption("可能的认知偏差：" + "、".join(labels))


def history_for_llm():
    return [
        {"role": item["role"], "content": item["content"]}
        for item in st.session_state.messages
        if item["role"] in {"user", "assistant"}
    ][-10:]


def handle_review_message(user_input: str) -> None:
    history = history_for_llm()

    with st.chat_message("assistant"):
        placeholder = st.empty()
        with st.spinner("Echo 正在分析情绪与认知模式..."):
            try:
                service = get_llm_service()
                analysis = run_async(service.analyze_emotion_and_biases_merged(user_input))
                response = run_async(
                    collect_stream(
                        service.generate_socratic_response_stream(
                            user_input,
                            history,
                            analysis.get("cognitive_biases"),
                        )
                    )
                )
            except Exception:
                analysis = {
                    "emotion_analysis": None,
                    "cognitive_biases": None,
                }
                response = (
                    "当前无法连接大模型服务。请确认 Streamlit Secrets 中已经配置可用的 "
                    "`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`，然后再试一次。"
                )
        placeholder.markdown(response)

    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": response,
            "emotion": analysis.get("emotion_analysis"),
            "biases": analysis.get("cognitive_biases"),
        }
    )


def handle_simulation_message(user_input: str) -> None:
    history = history_for_llm()
    with st.chat_message("assistant"):
        placeholder = st.empty()
        with st.spinner("对方正在回复..."):
            try:
                response = run_async(
                    collect_stream(
                        get_llm_service().generate_simulation_response_stream(
                            user_input,
                            history,
                            st.session_state.scenario_id,
                            st.session_state.custom_options,
                        )
                    )
                )
            except Exception:
                response = (
                    "当前无法连接大模型服务。请确认 Streamlit Secrets 中已经配置可用的 "
                    "`DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`，然后再试一次。"
                )
        placeholder.markdown(response)

    st.session_state.messages.append({"role": "assistant", "content": response})


def render_actions() -> None:
    cols = st.columns(2)
    with cols[0]:
        if st.button("生成本次训练报告", use_container_width=True, disabled=not st.session_state.messages):
            with st.spinner("正在生成报告..."):
                try:
                    report = run_async(get_llm_service().generate_conversation_report(history_for_llm()))
                except Exception:
                    report = {
                        "score": 0,
                        "report": "当前无法连接大模型服务，请检查 Streamlit Secrets 中的 API Key 配置。",
                    }
            st.session_state.reports.insert(0, report)
    with cols[1]:
        if st.session_state.mode == "simulation" and st.button(
            "不知道怎么回？",
            use_container_width=True,
            disabled=not st.session_state.messages,
        ):
            st.session_state.show_hint = True

    if st.session_state.get("show_hint"):
        with st.form("hint_form"):
            reason = st.text_area("你现在犹豫的原因", placeholder="例如：我怕拒绝对方会让关系变僵。")
            submitted = st.form_submit_button("获取回复建议")
            if submitted and reason.strip():
                with st.spinner("正在生成建议..."):
                    try:
                        hint = run_async(get_llm_service().generate_simulation_hint(history_for_llm(), reason.strip()))
                    except Exception:
                        hint = {
                            "suggested_reply": "暂时无法生成建议，请先用一句简单、礼貌、低压力的话回应对方。",
                            "reasoning": "当前无法连接大模型服务，请检查 Streamlit Secrets 中的 API Key 配置。",
                        }
                st.success("建议回复")
                st.write(hint.get("suggested_reply", ""))
                st.caption(hint.get("reasoning", ""))
                st.session_state.show_hint = False

    for report in st.session_state.reports[:3]:
        with st.expander(f"训练报告 · {report.get('score', 0)} 分", expanded=True):
            st.markdown(report.get("report", "暂无报告内容。"))


def main() -> None:
    st.set_page_config(page_title="Echo", page_icon="🫧", layout="wide")
    configure_from_secrets()
    init_state()
    sidebar()

    st.title("Echo")
    st.caption("面向大学生的 AI 社交焦虑认知训练与复盘系统")

    render_messages()

    placeholder = "描述一次让你焦虑的社交经历..." if st.session_state.mode == "review" else "输入你想对对方说的话..."
    if user_input := st.chat_input(placeholder):
        st.session_state.messages.append({"role": "user", "content": user_input})
        with st.chat_message("user"):
            st.markdown(user_input)

        if st.session_state.mode == "review":
            handle_review_message(user_input)
        else:
            handle_simulation_message(user_input)

    render_actions()


if __name__ == "__main__":
    main()
