import os
import pytest

from feed.callback import maybe_refuse_payment_line
from feed.models import WorldEvent


pytestmark = pytest.mark.slow


def test_callback_line_references_rescue():
    if not os.environ.get("MESHAPI_API_KEY"):
        pytest.skip("no MESHAPI_API_KEY in env (slow tests need real LLM keys)")

    ev = WorldEvent(id="e1", who="player", verb="rescued", object="a girl",
                    where="residential/fire_house", when=0.0, sentiment="heroic")
    line = maybe_refuse_payment_line(event=ev)
    assert line, "expected a generated line; got None"
    lowered = line.lower()
    assert (
        "niece" in lowered
        or "fire" in lowered
        or "rescue" in lowered
        or "hero" in lowered
        or "on the house" in lowered
    ), line