from __future__ import annotations
from feed.feed_service import FeedService


def reaches_by(fs: FeedService, post_id: str, *, npc_audience: str,
               max_t: float) -> bool:
    """Pure query: would post `post_id` have reached an NPC of `npc_audience`
    by time `max_t`?"""
    p = fs.get_post(post_id)
    if p is None:
        return False
    if p.audience == "town" or p.audience == npc_audience:
        return True
    for rt in fs.list_posts(audience=npc_audience, since=None):
        if rt.parent == post_id and rt.ts <= max_t:
            return True
    return False


def compute_promotions(fs: FeedService, *, target_audience: str, by_ts: float) -> None:
    """Promote any residential/market post to `target_audience` if it has been
    sitting longer than by_ts sim seconds. This guarantees the demo's beat 2
    lands on schedule under slow natural spread."""
    for p in fs.all_posts():
        if p.audience == target_audience:
            continue
        if p.ts <= by_ts and p.audience != "town":
            p.audience = target_audience