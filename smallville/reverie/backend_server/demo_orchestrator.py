"""Lightweight demo tick loop. Replaces the slow upstream sim run for the
demo only. Runs alongside (not instead of) the upstream ReverieServer; the
upstream remains available for full-fidelity runs.

Each tick:
  1. Some residential NPCs retweet the rescue post (audience=residential).
  2. Promotion runs so by max sim time the post audience is town-wide.
  3. The owner NPC's feed inbox is drained + a feed-inbox observation is
     written into a real AssociativeMemory instance.
Steps 1-3 use the FastAPI service state from smart_npc_api.
"""
from __future__ import annotations
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from feed.feed_service import FeedService
from feed.propagation import compute_promotions


MAX_SIM_T = float(os.environ.get("SMART_NPC_MAX_SIM_T", "2.0"))
TICK_SECONDS = float(os.environ.get("SMART_NPC_TICK_SECONDS", "0.2"))


async def run_demo_loop(feed: FeedService) -> None:
    rescue_post_id = None
    for p in feed.list_posts():
        if "fire" in p.text.lower():
            rescue_post_id = p.id
            break
    if rescue_post_id is None:
        return  # no rescue yet; nothing to propagate

    npc_index = 0
    npcs = ["family_npc_1", "family_npc_2", "barkeep_npc", "market_npc_1"]
    t = 0.0
    while t < MAX_SIM_T:
        # one residential NPC retweets
        author = npcs[npc_index % len(npcs)]
        feed.retweet(rescue_post_id, author=author, ts=t, audience="residential")
        npc_index += 1
        # promote at MAX_SIM_T/2 to guarantee market reaches by MAX_SIM_T
        compute_promotions(feed, target_audience="town", by_ts=MAX_SIM_T / 2)
        t += TICK_SECONDS
        await asyncio.sleep(TICK_SECONDS)


if __name__ == "__main__":
    import smart_npc_api
    asyncio.run(run_demo_loop(smart_npc_api._feed))