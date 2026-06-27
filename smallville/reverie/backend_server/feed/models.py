from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class WorldEvent:
    id: str
    who: str
    verb: str
    object: str
    where: str
    when: float
    sentiment: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class Post:
    id: str
    author: str          # NPC name or "player"
    text: str
    ts: float
    parent: Optional[str] = None   # id of retweeted/origin post
    reach: int = 1
    audience: str = "town"        # residential | market | town

    def to_dict(self) -> dict:
        return asdict(self)
