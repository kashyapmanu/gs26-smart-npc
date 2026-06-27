"""Integration test: rescue event -> propagation -> market NPC's feed inbox.

LLM is entirely stubbed; we only assert the deterministic parts of the
feed/memory pipeline. Run with: pytest -v tests/smart_npc/test_integration_propagation.py
"""
from fastapi.testclient import TestClient
from smart_npc_api import app, reset_state
from feed.propagation import reaches_by, compute_promotions
from feed.feed_service import FeedService


def test_rescue_propagates_to_market_by_max_t():
    reset_state()
    client = TestClient(app)
    # Beat 1: rescue
    r = client.post("/player/action", json={
        "type": "rescue_person", "where": "residential/fire_house", "t": 0.0
    })
    assert r.status_code == 200
    posts = client.get("/feed").json()["posts"]
    assert len(posts) == 1
    rescue_post_id = posts[0]["id"]
    fs = _get_internal_feed()

    # No retweets yet -> should not reach market naturally
    assert reaches_by(fs, rescue_post_id, npc_audience="market",
                      max_t=1.0) is False

    # Simulate propagation: family NPC (residential audience) retweets
    fs.retweet(rescue_post_id, author="family_npc", ts=0.5, audience="residential")
    # Still not market-reached
    assert reaches_by(fs, rescue_post_id, npc_audience="market",
                      max_t=1.0) is False

    # Promotion kicks in: by sim time 1.0, post audience promoted to town
    compute_promotions(fs, target_audience="town", by_ts=1.0)
    assert reaches_by(fs, rescue_post_id, npc_audience="market",
                      max_t=2.0) is True


def _get_internal_feed() -> FeedService:
    import smart_npc_api as m
    return m._feed