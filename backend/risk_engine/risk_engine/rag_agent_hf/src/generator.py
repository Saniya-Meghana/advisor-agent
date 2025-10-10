# src/generator.py
from transformers import pipeline
import yaml

DEFAULT_CONFIG = "config.yaml"

def load_config(path=DEFAULT_CONFIG):
    with open(path, "r") as f:
        return yaml.safe_load(f)

def load_generator(model_name=None, device=-1):
    if model_name is None:
        cfg = load_config()
        model_name = cfg["generator_model"]
    gen = pipeline("text2text-generation", model=model_name, device=device)
    return gen

def answer_with_context(generator, question: str, contexts: list, max_length: 512):
    prompt = "You are a compliance assistant that answers questions using only the provided contexts. Cite the context indexes you used.\n\n"
    for i, c in enumerate(contexts):
        prompt += f"[CONTEXT {i}] {c['doc']['text']}\n\n"
    prompt += f"Question: {question}\nAnswer:"

    out = generator(prompt, max_length=max_length, do_sample=False, num_return_sequences=1)[0]["generated_text"]
    return out
