"""
Gemini LLM client for v2 resume generation pipeline.
Primary model: gemini-2.5-flash (matches parent project).
"""

import os
import json
import re
import logging
from typing import Any, Optional

logger = logging.getLogger("llm_client")

_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    return _client


def _repair_json(text: str) -> str:
    """Repair common LLM JSON errors: trailing commas, truncated strings, unbalanced braces."""
    # Remove trailing commas before closing brackets/braces
    text = re.sub(r',\s*([}\]])', r'\1', text)

    # Close any unterminated string value at end of text
    # e.g. ..."category": "soft-skill  →  ..."category": "soft-skill"
    if re.search(r':\s*"[^"]*$', text):
        text = text.rstrip() + '"'

    # Balance braces
    diff_brace = text.count("{") - text.count("}")
    if diff_brace > 0:
        text += "}" * diff_brace

    # Balance brackets
    diff_bracket = text.count("[") - text.count("]")
    if diff_bracket > 0:
        text += "]" * diff_bracket

    # One more trailing-comma pass after injected closers
    text = re.sub(r',\s*([}\]])', r'\1', text)

    return text


def _extract_json(text: str) -> Any:
    """Extract and parse JSON from an LLM response."""
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*", "", text)
    text = re.sub(r"```\s*$", "", text, flags=re.MULTILINE)
    # Strip thinking blocks if they leaked through
    if "<thought>" in text and "</thought>" in text:
        text = text.split("</thought>")[-1]
    text = text.strip()

    # First attempt: raw parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Second attempt: fix unescaped backslashes (common in LaTeX responses)
    text2 = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r'\\\\', text)
    try:
        return json.loads(text2)
    except json.JSONDecodeError:
        pass

    # Third attempt: repair truncated / malformed JSON
    repaired = _repair_json(text2)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse failed after repair: {e}\nText end: ...{text[-400:]}")
        raise


async def call_gemini(
    prompt: str,
    model: str = "gemini-2.5-flash",
    max_tokens: int = 65536,
) -> Any:
    """Call Gemini with JSON response mode and return parsed JSON."""
    import asyncio
    from google.genai import types

    client = _get_client()
    loop = asyncio.get_event_loop()

    def _call():
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                max_output_tokens=max_tokens,
                temperature=0.0,
            ),
        )
        return response.text

    raw = await loop.run_in_executor(None, _call)
    logger.debug(f"Gemini response ({len(raw)} chars)")
    return _extract_json(raw)


async def call_gemini_text(
    prompt: str,
    model: str = "gemini-2.5-flash",
    max_tokens: int = 8192,
    system_instruction: Optional[str] = None,
) -> str:
    """Call Gemini and return raw text (not JSON)."""
    import asyncio
    from google.genai import types

    client = _get_client()
    loop = asyncio.get_event_loop()

    def _call():
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=max_tokens,
                temperature=0.3,
                system_instruction=system_instruction,
            ),
        )
        return response.text

    return await loop.run_in_executor(None, _call)


async def call_openai_json(
    instructions: str,
    prompt: str,
    model: str = "gpt-5-mini",
    max_output_tokens: int = 4096,
) -> Any:
    """Call OpenAI's Responses API and parse the model's JSON review."""
    import asyncio
    from openai import OpenAI

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY must be set to run the resume quality review.")

    def _call():
        client = OpenAI(api_key=api_key, timeout=45.0, max_retries=1)
        response = client.responses.create(
            model=model,
            instructions=instructions,
            input=prompt,
            max_output_tokens=max_output_tokens,
        )
        return response.output_text

    loop = asyncio.get_running_loop()
    raw = await loop.run_in_executor(None, _call)
    logger.debug("OpenAI review response (%s chars)", len(raw))
    return _extract_json(raw)
