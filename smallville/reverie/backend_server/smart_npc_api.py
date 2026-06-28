from __future__ import annotations
import asyncio
import json
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from feed.callback import maybe_refuse_payment_line
from feed.event_service import PlayerEventService
from feed.feed_service import FeedService

app = FastAPI(title="Smart NPCs API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_feed = FeedService()
_events = PlayerEventService(feed=_feed)


class _StubNode:
    def __init__(self, description: str):
        self.description = description


class _StubOwnerMemory:
    """Minimal stand-in for upstream AssociativeMemory when running the
    Smart NPCs demo without the full ReverieServer. Exposes `feed_inbox`
    (consumed by feed.feed_inbox.deliver_to_inbox's idempotency check)."""

    def __init__(self) -> None:
        self.seq_event: list = []
        self.feed_inbox: list = []

    def add_event(self, created, expiration, s, p, o,
                  description, keywords, poignancy, embedding_pair, filling):
        self.seq_event.append(_StubNode(description))
        return None  # upstream returns a ConceptNode; None is fine for demo


_owner_memory = _StubOwnerMemory()


def reset_state() -> None:
    """Test helper: wipe in-memory services between tests."""
    global _feed, _events, _owner_memory
    _feed = FeedService()
    _events = PlayerEventService(feed=_feed)
    _owner_memory = _StubOwnerMemory()


class ActionIn(BaseModel):
    type: str
    where: str = ""
    t: float = 0.0


@app.post("/player/action")
def post_action(action: ActionIn):
    ev = _events.handle_action({"type": action.type, "where": action.where}, t=action.t)
    if action.type == "order_food":
        line = maybe_refuse_payment_line(event=ev)
        if line:
            # Surface the LLM line as a feed post authored by the restaurant
            # owner. The feed overlay (frontend) will render it live.
            _feed.create_post(
                author="restaurant owner",
                text=line,
                ts=action.t,
                audience="town",
            )
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
        emitted: set = set()
        while True:
            for p in _feed.list_posts():
                if p.id in emitted:
                    continue
                emitted.add(p.id)
                yield f"data: {json.dumps(p.to_dict())}\n\n"
            await asyncio.sleep(0.5)
    return StreamingResponse(gen(), media_type="text/event-stream")


# In-process orchestrator launcher. The orchestrator shares this process's
# `_feed` and `_owner_memory`, so it can mutate them directly. Triggered by
# the demo driver (or the frontend) once the rescue post exists.
_orchestrator_task = None


class _OwnerPersonaWrap:
    """Wraps the module-level `_owner_memory` so feed.feed_inbox.deliver_to_inbox
    (which reads `persona.a_mem`) is satisfied."""

    def __init__(self):
        self.a_mem = _owner_memory
        self.scratch = type("Scratch", (), {"curr_time": None})()


@app.post("/orchestrator/start")
async def orchestrator_start():
    """Start the demo propagation loop in the background. Idempotent — only
    one orchestrator runs at a time. Returns immediately."""
    global _orchestrator_task
    from demo_orchestrator import run_demo_loop
    if _orchestrator_task is None or _orchestrator_task.done():
        _orchestrator_task = asyncio.create_task(
            run_demo_loop(_feed, owner_persona=_OwnerPersonaWrap())
        )
        return {"status": "started"}
    return {"status": "already_running"}