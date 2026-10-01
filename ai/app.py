from datetime import date, datetime
from pathlib import Path
from typing import Optional
import json

from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL
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

    if deadline:
        try:
            deadline_date = datetime.strptime(
                deadline,
                "%Y-%m-%d"
            ).date()

            today = date.today()
            days_remaining = (deadline_date - today).days

            deadline_value = (
                f"{deadline} "
                f"({days_remaining} calendar days remaining from today)."
            )

        except ValueError:
            deadline_value = (
                f"{deadline} "
                f"(invalid deadline format)."
            )

    else:
        deadline_value = "No deadline provided."

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

    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. "
            "Add it to the .env file before running CareerMatch."
        )

    client = Groq(api_key=GROQ_API_KEY)

    prompt = build_prompt(
        cv_text=cv_text,
        job_description=job_description,
        deadline=deadline,
    )

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "career_match_result",
                "schema": CareerMatchResult.model_json_schema(),
            },
        },
    )

    content = response.choices[0].message.content

    if not content:
        raise RuntimeError(
            "Groq returned an empty response."
        )

    try:
        result = CareerMatchResult.model_validate(
            json.loads(content)
        )
    except Exception as error:
        raise RuntimeError(
            f"Groq returned an invalid CareerMatch response: {error}"
        ) from error

    # Hard safety check:
    # Never allow a roadmap item to exceed the available
    # time before the application deadline.
    if deadline:
        try:
            deadline_date = datetime.strptime(
                deadline,
                "%Y-%m-%d"
            ).date()

            today = date.today()
            days_remaining = (deadline_date - today).days

            if days_remaining <= 0:
                result.roadmap = []

            else:
                valid_roadmap = []

                for item in result.roadmap:
                    try:
                        duration_text = item.days.lower()

                        digits = "".join(
                            character
                            for character in duration_text
                            if character.isdigit()
                        )

                        if not digits:
                            continue

                        duration_days = int(digits)

                        if duration_days <= days_remaining:
                            valid_roadmap.append(item)

                    except (ValueError, AttributeError):
                        continue

                result.roadmap = valid_roadmap

        except ValueError:
            # Invalid deadline format:
            # do not apply deadline-based roadmap filtering.
            pass

    return result
