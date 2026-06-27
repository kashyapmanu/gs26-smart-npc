import pytest
from django.test import Client


@pytest.mark.django_db
def test_smart_npc_demo_renders():
    c = Client()
    response = c.get('/smart-npc-demo/')
    assert response.status_code == 200
    content = response.content.decode('utf-8')
    assert '<title>Smart NPCs Demo</title>' in content
    assert 'id="game-container"' in content
    assert 'id="feed-toggle"' in content
    assert 'id="smart-npc-help"' in content
    assert '/static/css/smart_npc_demo.css' in content
    assert '/static/assets/js/smart_npc_game.js' in content
