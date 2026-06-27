from __future__ import annotations
import threading
from typing import List, Optional
from feed.models import Post


class FeedService:
    """In-world social network store. Thread-safe; in-memory."""

    def __init__(self) -> None:
        self._posts: dict = {}
        self._order: list = []
        self._lock = threading.RLock()
        self._seq = 0

    def create_post(self, *, author: str, text: str, ts: float, audience: str = "town",
                    parent: Optional[str] = None) -> Post:
        with self._lock:
            self._seq += 1
            pid = f"post-{self._seq}"
            p = Post(id=pid, author=author, text=text, ts=ts, parent=parent, reach=1, audience=audience)
            self._posts[pid] = p
            self._order.append(pid)
            return p

    def retweet(self, parent_id: str, *, author: str, ts: float, audience: str) -> Post:
        with self._lock:
            orig = self._posts[parent_id]
            rt = self.create_post(author=author, text=orig.text, ts=ts, audience=audience, parent=parent_id)
            orig.reach += 1
            return rt

    def get_post(self, post_id: str) -> Optional[Post]:
        with self._lock:
            return self._posts.get(post_id)

    def list_posts(self, *, audience: Optional[str] = None,
                   since: Optional[float] = None,
                   npc_id: Optional[str] = None) -> List[Post]:
        with self._lock:
            out = []
            for pid in self._order:
                p = self._posts[pid]
                if audience is not None and p.audience not in (audience, "town"):
                    continue
                if since is not None and p.ts < since:
                    continue
                out.append(p)
            return out

    def all_posts(self) -> List[Post]:
        with self._lock:
            return [self._posts[pid] for pid in self._order]
