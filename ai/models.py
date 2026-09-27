from pydantic import BaseModel, Field
from typing import List, Optional


class SkillMatch(BaseModel):
    skill: str
    evidence: str


class MissingSkill(BaseModel):
    skill: str
    reason: str


class RoadmapItem(BaseModel):
    skill: str
    days: str
    goal: str


class CareerMatchResult(BaseModel):
    match_score: int = Field(ge=0, le=100)
    summary: str

    matched: List[SkillMatch]
    missing: List[MissingSkill]

    weak: List[SkillMatch]

    roadmap: List[RoadmapItem]

    cv_recommendations: List[str]
    cover_letter: Optional[str] = None