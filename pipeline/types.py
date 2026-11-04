"""Shared pipeline types (same field names as engine/spec.ts)."""
from typing import Literal, TypedDict

Word = TypedDict("Word", {"id": str, "text": str, "start": float, "end": float})
Group = TypedDict("Group", {"text": str, "start": float, "end": float})
Mood = Literal["curioso", "animado", "tenso", "calmo"]


class SfxCue(TypedDict, total=False):
    t: float
    name: str
    gainDb: float
