"""
Echo LLM 服务模块
封装与大模型 API (如 DeepSeek, OpenAI) 的交互，处理多层 Prompt 架构的调用
"""

import os
import json
import logging
from httpx import AsyncClient
from dotenv import load_dotenv
import prompt_templates as prompts

# 加载环境变量
load_dotenv()

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# LLM 配置
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek").lower()
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


class LLMService:
    def __init__(self):
        self.provider = LLM_PROVIDER
        self.client = AsyncClient(timeout=30.0)

    async def _call_api(self, messages: list, is_json_mode: bool = False, temperature: float = 0.7) -> str:
        """底层 API 调用封装，支持不同 Provider"""
        
        # 针对当前处于开发/作业模式，可以做个 mock 或者简单的容错
        if not DEEPSEEK_API_KEY and not OPENAI_API_KEY:
             logger.warning("No API key found. Using mock response.")
             if is_json_mode:
                 return json.dumps({"mock": "Please set API key in .env"})
             return "Please configure the LLM API key in the .env file."

        if self.provider == "deepseek":
            return await self._call_deepseek(messages, is_json_mode, temperature)
        elif self.provider == "openai":
            return await self._call_openai(messages, is_json_mode, temperature)
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    async def _call_deepseek(self, messages: list, is_json_mode: bool, temperature: float) -> str:
        headers = {
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": DEEPSEEK_MODEL,
            "messages": messages,
            "temperature": temperature,
        }
        
        if is_json_mode:
             # DeepSeek 某些模型支持 response_format={"type": "json_object"}，这里我们通过 prompt 强约束并尝试解析
             pass

        try:
            # 兼容 OpenAI 格式的 API 接口
            url = f"{DEEPSEEK_BASE_URL.rstrip('/')}/v1/chat/completions"
            if "api.deepseek.com" in DEEPSEEK_BASE_URL:
                url = "https://api.deepseek.com/chat/completions"
                
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]
        except Exception as e:
            logger.error(f"DeepSeek API call failed: {e}")
            raise

    async def _call_openai(self, messages: list, is_json_mode: bool, temperature: float) -> str:
        # 如果需要，这里可以引入真实的 openai python 包。为保持轻量，这里依然可以用 httpx 调用 REST API
        import openai
        
        openai.api_key = OPENAI_API_KEY
        
        kwargs = {
            "model": OPENAI_MODEL,
            "messages": messages,
            "temperature": temperature,
        }
        
        if is_json_mode:
             kwargs["response_format"] = { "type": "json_object" }

        try:
             from openai import AsyncOpenAI
             client_kwargs = {"api_key": OPENAI_API_KEY}
             if OPENAI_BASE_URL:
                 client_kwargs["base_url"] = OPENAI_BASE_URL
             client = AsyncOpenAI(**client_kwargs)
             response = await client.chat.completions.create(**kwargs)
             return response.choices[0].message.content
        except Exception as e:
             logger.error(f"OpenAI API call failed: {e}")
             raise

    # ---------------------------------------------------------
    # 业务流水线调用
    # ---------------------------------------------------------

    async def analyze_emotion(self, user_input: str) -> dict:
        """Layer 1: 情绪分析"""
        messages = [
            {"role": "system", "content": prompts.EMOTION_ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": f"用户的描述: {user_input}"}
        ]
        
        response_text = await self._call_api(messages, is_json_mode=True, temperature=0.1)
        
        try:
            # 简单的清洗，防止大模型包裹了 markdown 代码块
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            return json.loads(cleaned_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse emotion analysis JSON: {response_text}")
            # 返回默认兜底数据
            return {
                "emotion": "unknown",
                "intensity": 0.5,
                "trigger_event": user_input,
                "anxiety_level": "中"
            }

    async def detect_cognitive_biases(self, user_input: str, emotion_data: dict) -> dict:
        """Layer 2: 认知偏差识别"""
        
        context = f"用户描述: {user_input}\n已识别情绪: {emotion_data.get('emotion')}, 强度: {emotion_data.get('intensity')}"
        
        messages = [
            {"role": "system", "content": prompts.COGNITIVE_BIAS_DETECTION_PROMPT},
            {"role": "user", "content": context}
        ]
        
        response_text = await self._call_api(messages, is_json_mode=True, temperature=0.2)
        
        try:
            cleaned_text = response_text.strip()
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            if cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
            return json.loads(cleaned_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse cognitive bias JSON: {response_text}")
            return {"detected_biases": [], "overall_assessment": "解析失败"}

    async def generate_socratic_response(self, user_input: str, history: list, biases: dict = None) -> str:
        """Layer 3: Socratic Coaching 回复生成"""
        
        messages = [
            {"role": "system", "content": prompts.SOCRATIC_COACHING_SYSTEM_PROMPT}
        ]
        
        # 注入识别到的偏差作为系统上下文（对用户不可见）
        if biases and biases.get("detected_biases"):
            bias_info = ", ".join([b.get("bias_type", "") for b in biases.get("detected_biases", [])])
            if bias_info:
                messages.append({
                    "role": "system", 
                    "content": f"系统提示：当前检测到用户可能存在以下认知偏差：{bias_info}。请在提问中针对性地引导。"
                })

        # 添加历史对话 (为了简单，这里 history 期望格式也是 {"role": "...", "content": "..."})
        # 限制历史长度
        messages.extend(history[-10:])
        
        # 添加最新用户输入
        messages.append({"role": "user", "content": user_input})
        
        return await self._call_api(messages, temperature=0.7)

    async def generate_simulation_response(self, user_input: str, history: list, scenario_id: str, custom_options: dict = None) -> str:
        """社交模拟模式：纯角色扮演，不做 CBT 分析"""
        system_prompt = prompts.get_simulation_prompt(scenario_id, custom_options)
        
        messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 将历史记录和当前输入合并
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_input})
        
        return await self._call_api(messages, temperature=0.7)

    async def generate_conversation_report(self, history: list) -> dict:
        """对话结束时生成分析报告并打分"""
        # 将历史记录格式化为字符串
        history_text = ""
        for msg in history:
            role = "用户" if msg["role"] == "user" else "AI"
            history_text += f"{role}: {msg['content']}\n"

        prompt = prompts.END_CONVERSATION_REPORT_PROMPT.format(chat_history=history_text)
        messages = [{"role": "system", "content": prompt}]
        response_text = await self._call_api(messages, is_json_mode=True, temperature=0.7)
        
        try:
            cleaned_text = response_text
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            return json.loads(cleaned_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse report JSON: {response_text}")
            return {
                "score": 0,
                "report": response_text
            }

    async def generate_simulation_hint(self, history: list, hesitation_reason: str) -> dict:
        """生成模拟对话求助建议"""
        history_text = ""
        for msg in history:
            role = "用户" if msg["role"] == "user" else "AI"
            history_text += f"{role}: {msg['content']}\n"
            
        prompt = prompts.SIMULATION_HINT_PROMPT.format(
            reason=hesitation_reason, 
            chat_history=history_text
        )
        messages = [{"role": "system", "content": prompt}]
        response_text = await self._call_api(messages, is_json_mode=True, temperature=0.7)
        
        try:
            cleaned_text = response_text
            if cleaned_text.startswith("```json"):
                cleaned_text = cleaned_text[7:]
            elif cleaned_text.startswith("```"):
                cleaned_text = cleaned_text[3:]
            if cleaned_text.endswith("```"):
                cleaned_text = cleaned_text[:-3]
                
            return json.loads(cleaned_text.strip())
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse hint JSON: {response_text}")
            return {
                "suggested_reply": "系统暂时无法解析建议，请尝试自行回复或稍后再试。", 
                "reasoning": "大模型返回格式异常。"
            }
        
    async def process_full_pipeline(self, user_input: str, history: list = None) -> dict:
        """执行完整的一轮分析流水线"""
        if history is None:
            history = []
            
        logger.info("Starting emotion analysis...")
        emotion_data = await self.analyze_emotion(user_input)
        
        logger.info("Starting cognitive bias detection...")
        bias_data = await self.detect_cognitive_biases(user_input, emotion_data)
        
        logger.info("Generating socratic response...")
        reply_text = await self.generate_socratic_response(user_input, history, bias_data)
        
        return {
            "reply": reply_text,
            "emotion_analysis": emotion_data,
            "cognitive_biases": bias_data
        }

# 单例实例
llm_service = LLMService()
