from fastapi.testclient import TestClient
from smart_npc_api import app, reset_state


def test_post_action_rescue_seeds_feed_post():
    reset_state()
    client = TestClient(app)
    r = client.post("/player/action", json={"type": "rescue_person",
                                             "where": "residential/fire_house", "t": 0.0})
    assert r.status_code == 200
    body = r.json()
    assert body["verb"] == "rescued"
    r2 = client.get("/feed")
    assert any("fire" in p["text"].lower() for p in r2.json()["posts"])


def test_get_events_since_filter():
    reset_state()
    client = TestClient(app)
    client.post("/player/action", json={"type": "rescue_person",
                                        "where": "x", "t": 1.0})
    client.post("/player/action", json={"type": "order_food",
                                        "where": "y", "t": 5.0})
    r = client.get("/events?since=3.0")
    assert len(r.json()["events"]) == 1