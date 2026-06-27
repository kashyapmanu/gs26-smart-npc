from __future__ import annotations
import asyncio
import json
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from feed.event_service import PlayerEventService
from feed.feed_service import FeedService

app = FastAPI(title="Smart NPCs API")

_feed = FeedService()
_events = PlayerEventService(feed=_feed)


def reset_state() -> None:
    """Test helper: wipe in-memory services between tests."""
    global _feed, _events
    _feed = FeedService()
    _events = PlayerEventService(feed=_feed)


class ActionIn(BaseModel):
    type: str
    where: str = ""
    t: float = 0.0


@app.post("/player/action")
def post_action(action: ActionIn):
    ev = _events.handle_action({"type": action.type, "where": action.where}, t=action.t)
    return ev.to_dict()


@app.get("/events")
def get_events(since: float = Query(default=0.0)):
    return {"events": [e.to_dict() for e in _events.list_events(since=since)]}


@app.get("/feed")
def get_feed(audience: Optional[str] = None, since: Optional[float] = None):
    return {"posts": [p.to_dict() for p in _feed.list_posts(audience=audience, since=since)]}


@app.get("/feed/stream")
async def stream_feed():
    async def gen():
        last_seen = 0
        while True:
            posts = _feed.list_posts(since=last_seen)
            for p in posts:
                last_seen = max(last_seen, p.ts)
                yield f"data: {json.dumps(p.to_dict())}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(gen(), media_type="text/event-stream")