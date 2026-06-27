"""Lightweight demo tick loop. Replaces the slow upstream sim run for the
demo only. Runs alongside (not instead of) the upstream ReverieServer; the
upstream remains available for full-fidelity runs.

Each tick:
  1. Some residential NPCs retweet the rescue post (audience=residential).
  2. Promotion runs so by max sim time the post audience is town-wide.
  3. On first rescue observation, deliver the rescue post into the owner
     persona's memory so Beat 3's maybe_refuse_payment_line can recall it
     when the player enters the restaurant hotspot (`order_food`).
"""
from __future__ import annotations
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from feed.feed_service import FeedService
from feed.feed_inbox import deliver_to_inbox
from feed.propagation import compute_promotions


MAX_SIM_T = float(os.environ.get("SMART_NPC_MAX_SIM_T", "2.0"))
TICK_SECONDS = float(os.environ.get("SMART_NPC_TICK_SECONDS", "0.2"))


async def run_demo_loop(feed: FeedService, owner_persona=None) -> None:
    rescue_post_id = None
    rescue_post_obj = None
    for p in feed.list_posts():
        if "fire" in p.text.lower():
            rescue_post_id = p.id
            rescue_post_obj = p
            break
    if rescue_post_id is None:
        return  # no rescue yet; nothing to propagate

    if owner_persona is not None:
        deliver_to_inbox(owner_persona, post=rescue_post_obj)

    npc_index = 0
    npcs = ["family_npc_1", "family_npc_2", "barkeep_npc", "market_npc_1"]
    t = rescue_post_obj.ts  # start at the rescue post's ts so retweets have monotonically increasing ts above
    while t < rescue_post_obj.ts + MAX_SIM_T:
        author = npcs[npc_index % len(npcs)]
        feed.retweet(rescue_post_id, author=author, ts=t, audience="residential")
        npc_index += 1
        compute_promotions(feed, target_audience="town", by_ts=rescue_post_obj.ts + (MAX_SIM_T / 2))
        t += TICK_SECONDS
        await asyncio.sleep(TICK_SECONDS)


if __name__ == "__main__":
    import smart_npc_api
    # Wrap the module-level _owner_memory in a tiny object that has `.a_mem`
    # pointing at it, so feed.feed_inbox.deliver_to_inbox(persona, post=...)
    # which reads `persona.a_mem` is satisfied.
    class _OwnerPersonaWrap:
        def __init__(self):
            self.a_mem = smart_npc_api._owner_memory
            self.scratch = type("Scratch", (), {"curr_time": None})()

    asyncio.run(run_demo_loop(smart_npc_api._feed, owner_persona=_OwnerPersonaWrap()))