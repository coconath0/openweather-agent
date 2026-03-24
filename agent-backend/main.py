import json
import os

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_groq import ChatGroq
from pydantic import BaseModel

load_dotenv()
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

app = FastAPI(title="OpenWeather Agent Backend")

app.add_middleware(
	CORSMiddleware,
	allow_origins=CORS_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


class ChatRequest(BaseModel):
	message: str


@app.get("/health")
def health() -> dict:
	"""Lightweight health endpoint for local app checks."""
	return {"status": "ok"}


@tool
def get_current_weather(city: str) -> str:
	"""Fetch the current weather for a city from the MCP server."""
	if not MCP_SERVER_URL:
		raise ValueError("MCP_SERVER_URL is not set in environment variables.")

	response = requests.get(f"{MCP_SERVER_URL}/current-weather", params={"city": city}, timeout=45)
	response.raise_for_status()
	return json.dumps(response.json())


@tool
def get_forecast(city: str, days: int) -> str:
	"""Fetch weather forecast for a city and number of days from the MCP server."""
	if not MCP_SERVER_URL:
		raise ValueError("MCP_SERVER_URL is not set in environment variables.")

	response = requests.get(
		f"{MCP_SERVER_URL}/forecast",
		params={"city": city, "days": days},
		timeout=45,
	)
	response.raise_for_status()
	return json.dumps(response.json())


tools = [get_current_weather, get_forecast]

SYSTEM_PROMPT = (
	"You are a helpful weather assistant. When a user asks a weather-related question, "
	"use your tools to get real data before answering. Always mention the city name in "
	"your response. Be conversational and give practical advice based on the weather, "
	"for example, suggest activities or what to wear. "
	"When calling weather tools, pass only the city name without state, province, or country "
	"(e.g. use 'San Marcos' not 'San Marcos, TX')."
)


def build_agent_executor():
	"""Build the weather agent using classic APIs when available, otherwise use LangChain v1."""
	llm = ChatGroq(model="llama-3.1-8b-instant")
	try:
		from langchain.agents import AgentExecutor, create_tool_calling_agent

		prompt = ChatPromptTemplate.from_messages(
			[
				("system", SYSTEM_PROMPT),
				("human", "{input}"),
				MessagesPlaceholder("agent_scratchpad"),
			]
		)
		agent = create_tool_calling_agent(llm=llm, tools=tools, prompt=prompt)
		return AgentExecutor(agent=agent, tools=tools, verbose=True), "classic"
	except ImportError:
		from langchain.agents import create_agent

		agent_graph = create_agent(model=llm, tools=tools, system_prompt=SYSTEM_PROMPT)
		return agent_graph, "v1"


agent_executor = None
agent_mode = "uninitialized"


def get_agent_executor():
	"""Lazily initialize agent objects so module import stays safe for ASGI startup."""
	global agent_executor, agent_mode
	if agent_executor is None:
		agent_executor, agent_mode = build_agent_executor()
	return agent_executor, agent_mode


def run_agent(message: str) -> str:
	"""Invoke the agent and normalize output text across LangChain versions."""
	executor, mode = get_agent_executor()

	if mode == "classic":
		result = executor.invoke({"input": message})
		return str(result.get("output", result))

	result = executor.invoke({"messages": [{"role": "user", "content": message}]})
	messages = result.get("messages", []) if isinstance(result, dict) else []
	if not messages:
		return str(result)

	last = messages[-1]
	content = getattr(last, "content", last)
	if isinstance(content, str):
		return content
	if isinstance(content, list):
		parts = []
		for item in content:
			if isinstance(item, dict) and item.get("type") == "text":
				parts.append(item.get("text", ""))
			else:
				parts.append(str(item))
		return "".join(parts).strip()
	return str(content)


@app.post("/chat")
def chat(payload: ChatRequest) -> dict:
	"""Receive a user message, run the weather agent, and return the response text."""
	try:
		answer = run_agent(payload.message)
		return {"response": answer}
	except Exception as exc:
		err = str(exc)
		if "insufficient_quota" in err or "RateLimitError" in err or "Error code: 429" in err or "ResourceExhausted" in err or "RATE_LIMIT_EXCEEDED" in err or "rate_limit_exceeded" in err:
			raise HTTPException(
				status_code=503,
				detail=(
					"API quota/rate-limit reached. "
					"Please wait a moment and try again."
				),
			) from exc
		raise HTTPException(status_code=500, detail=f"Agent execution failed: {err}") from exc
