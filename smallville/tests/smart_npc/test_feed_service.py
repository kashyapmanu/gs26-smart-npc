from feed.feed_service import FeedService


def test_create_post_returns_post_with_id():
    fs = FeedService()
    p = fs.create_post(author="Isabella", text="hello", ts=0.0, audience="residential")
    assert p.id.startswith("post-") and p.reach == 1


def test_list_posts_filters_by_audience_and_since():
    fs = FeedService()
    a = fs.create_post(author="A", text="x", ts=1.0, audience="residential")
    b = fs.create_post(author="B", text="y", ts=2.0, audience="market")
    c = fs.create_post(author="C", text="z", ts=3.0, audience="residential")
    # audience="residential", since=1.5: excludes a (since) and b (audience), includes c
    listed = fs.list_posts(audience="residential", since=1.5)
    assert a not in listed
    assert b not in listed
    assert c in listed
    # audience=None (everyone), since=None: all posts
    all_listed = fs.list_posts()
    assert a in all_listed and b in all_listed and c in all_listed
    # a town-audience post is visible to any filter
    t = fs.create_post(author="T", text="t", ts=4.0, audience="town")
    assert t in fs.list_posts(audience="residential")


def test_retweet_increments_reach_and_links_parent():
    fs = FeedService()
    orig = fs.create_post(author="A", text="fire!", ts=0.0, audience="residential")
    rt = fs.retweet(orig.id, author="B", ts=1.0, audience="residential")
    assert rt.parent == orig.id
    assert fs.get_post(orig.id).reach == 2
