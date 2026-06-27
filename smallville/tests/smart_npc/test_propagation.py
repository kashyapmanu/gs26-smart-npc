from feed.propagation import reaches_by, compute_promotions
from feed.feed_service import FeedService


def test_reaches_by_within_audience_and_time():
    fs = FeedService()
    p = fs.create_post(author="A", text="fire!", ts=0.0, audience="residential")
    # NPC lives in residential district, post is in residential
    assert reaches_by(fs, p.id, npc_audience="residential", max_t=2.0) is True
    # NPC far away in market, no retweets yet
    assert reaches_by(fs, p.id, npc_audience="market", max_t=2.0) is False


def test_promote_forces_audience_to_town():
    fs = FeedService()
    p = fs.create_post(author="A", text="fire!", ts=0.0, audience="residential")
    compute_promotions(fs, target_audience="town", by_ts=1.0)
    assert fs.get_post(p.id).audience == "town"