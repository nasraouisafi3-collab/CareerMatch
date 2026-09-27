from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types

from config import GEMINI_API_KEY, GEMINI_MODEL
from models import CareerMatchResult


BASE_DIR = Path(__file__).resolve().parent

SYSTEM_PROMPT = (
    BASE_DIR / "prompts" / "system.txt"
).read_text(encoding="utf-8")

ANALYSIS_PROMPT = (
    BASE_DIR / "prompts" / "analysis.txt"
).read_text(encoding="utf-8")


def build_prompt(
    cv_text: str,
    job_description: str,
    deadline: Optional[str] = None,
) -> str:
    deadline_value = deadline if deadline else "No deadline provided."

    return ANALYSIS_PROMPT.format(
        cv_text=cv_text,
        job_description=job_description,
        deadline=deadline_value,
    )


def analyze_career_match(
    cv_text: str,
    job_description: str,
    deadline: Optional[str] = None,
) -> CareerMatchResult:

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured. "
            "Add it to the .env file before running CareerMatch."
        )

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = build_prompt(
        cv_text=cv_text,
        job_description=job_description,
        deadline=deadline,
    )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=CareerMatchResult,
            temperature=0.2,
        ),
    )

    if not response.parsed:
        raise RuntimeError(
            "Gemini returned an invalid structured response."
        )

    return response.parsed