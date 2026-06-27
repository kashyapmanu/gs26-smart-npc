from feed.models import Post, WorldEvent


def test_post_defaults():
    p = Post(id="p1", author="Isabella Rodriguez", text="hello", ts=0.0, audience="residential")
    assert p.parent is None
    assert p.reach == 1


def test_world_event_canonical():
    e = WorldEvent(id="e1", who="player", verb="rescued", object="a girl",
                   where="residential/fire_house", when=0.0, sentiment="heroic")
    assert e.to_dict()["where"] == "residential/fire_house"
