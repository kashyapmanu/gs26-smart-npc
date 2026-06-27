from __future__ import annotations
import uuid
from typing import Optional
from feed.models import WorldEvent
from feed.feed_service import FeedService


_ACTION_MAP = {
    "rescue_person": dict(verb="rescued", object="a girl", sentiment="heroic", audience="residential",
                          seed_text="A stranger pulled my niece from the fire today!"),
    "order_food":    dict(verb="ordered", object="food",   sentiment="neutral", audience=None,
                          seed_text=None),
}


class PlayerEventService:
    def __init__(self, feed: FeedService) -> None:
        self._feed = feed
        self._events: list = []

    def handle_action(self, action: dict, *, t: float) -> WorldEvent:
        atype = action.get("type", "")
        spec = _ACTION_MAP.get(atype)
        if spec is None:
            raise ValueError(f"unknown action type: {atype}")
        ev = WorldEvent(
            id=f"evt-{uuid.uuid4().hex[:10]}",
            who="player",
            verb=spec["verb"],
            object=spec["object"],
            where=action.get("where", ""),
            when=t,
            sentiment=spec["sentiment"],
        )
        self._events.append(ev)
        if spec["seed_text"] and spec["audience"]:
            self._feed.create_post(
                author="rescued family",
                text=spec["seed_text"],
                ts=t,
                audience=spec["audience"],
            )
        return ev

    def list_events(self, *, since: Optional[float] = None) -> list:
        if since is None:
            return list(self._events)
        return [e for e in self._events if e.when >= since]
