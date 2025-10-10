# src/agentic_agent.py
# Minimal wrapper for smolagents CodeAgent pattern
from smolagents import CodeAgent, HfApiModel
from typing import Any

class RAGAgent:
    def __init__(self, hf_model_id: str, retriever):
        # HfApiModel wraps a HF inference backend model
        self.model = HfApiModel(model_id=hf_model_id)
        # expose a retrieve tool which accepts question and k
        def retrieve_tool(q: str, k: int = 5):
            return retriever.query(q, k=k)
        self.agent = CodeAgent(model=self.model, tools=[("retrieve", retrieve_tool)])

    def run(self, question: str):
        return self.agent.run(question)
