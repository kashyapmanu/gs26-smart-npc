from feed.feed_service import FeedService
from feed.event_service import PlayerEventService


def test_feed_service_clear():
    fs = FeedService()
    fs.create_post(author="x", text="hello", ts=0.0)
    fs.clear()
    assert fs.list_posts() == []


def test_event_service_clear():
    fs = FeedService()
    es = PlayerEventService(feed=fs)
    es.handle_action({"type": "rescue_person", "where": "fire_house"}, t=0.0)
    es.clear()
    assert es.list_events() == []
