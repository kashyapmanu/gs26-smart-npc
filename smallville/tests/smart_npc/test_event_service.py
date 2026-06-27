from feed.event_service import PlayerEventService
from feed.feed_service import FeedService


def test_hotspot_action_canonicalizes_event_and_seeds_post():
    fs = FeedService()
    es = PlayerEventService(feed=fs)
    ev = es.handle_action({"type": "rescue_person", "where": "residential/fire_house"}, t=0.0)
    assert ev.who == "player"
    assert ev.verb == "rescued"
    assert ev.object == "a girl"
    assert ev.sentiment == "heroic"

    posts = fs.list_posts(audience="residential")
    assert len(posts) == 1
    assert "fire" in posts[0].text.lower()


def test_order_food_logs_event_without_seeding_propagation_post():
    fs = FeedService()
    es = PlayerEventService(feed=fs)
    ev = es.handle_action({"type": "order_food", "where": "market/restaurant"}, t=0.0)
    assert ev.verb == "ordered"
    assert ev.object == "food"
    assert fs.list_posts() == []
