import json
from pathlib import Path

# Palette of gids from Smallville tilesets. These are final-tuned visually
# in Task 8; start with plausible values from the existing the_ville map.
PALETTE = {
    "grass": 1,
    "road": 2,
    "house_wall": 3,
    "house_roof": 4,
    "restaurant_wall": 5,
    "restaurant_roof": 6,
    "tree": 7,
}

W, H = 50, 35


def fill(layer_name, default_gid, patch_fn=None):
    data = [default_gid] * (W * H)
    if patch_fn:
        patch_fn(data)
    return {
        "name": layer_name,
        "width": W,
        "height": H,
        "x": 0,
        "y": 0,
        "opacity": 1,
        "type": "tilelayer",
        "visible": True,
        "data": data,
    }


def street_patch(data):
    # Horizontal street across the middle (tiles y=20..22)
    for y in range(20, 23):
        for x in range(W):
            data[y * W + x] = PALETTE["road"]


def building_patch(data):
    # Burning house on the left, around (6..12, 16..24)
    for y in range(16, 25):
        for x in range(6, 13):
            data[y * W + x] = PALETTE["house_wall"]
    # Roof trim
    for x in range(6, 13):
        data[15 * W + x] = PALETTE["house_roof"]

    # Restaurant on the right, around (38..44, 16..24)
    for y in range(16, 25):
        for x in range(38, 45):
            data[y * W + x] = PALETTE["restaurant_wall"]
    for x in range(38, 45):
        data[15 * W + x] = PALETTE["restaurant_roof"]


def decor_patch(data):
    # A few trees/buildings top and bottom for town feel
    for x in [4, 18, 30, 46]:
        data[3 * W + x] = PALETTE["tree"]
        data[31 * W + x] = PALETTE["tree"]


layers = [
    fill("Ground", PALETTE["grass"], street_patch),
    fill("Buildings", 0, building_patch),
    fill("Decoration", 0, decor_patch),
]

# Tilesets: embed a minimal set that the existing smart_npc_game.js already loads.
tilesets = [
    {"firstgid": 1, "name": "CuteRPG_Field_B", "tilewidth": 32, "tileheight": 32},
]

map_doc = {
    "compressionlevel": -1,
    "height": H,
    "infinite": False,
    "layers": layers,
    "nextlayerid": len(layers) + 1,
    "nextobjectid": 1,
    "orientation": "orthogonal",
    "renderorder": "right-down",
    "tiledversion": "1.9",
    "tileheight": 32,
    "tilesets": tilesets,
    "tilewidth": 32,
    "type": "map",
    "version": "1.9",
    "width": W,
}

out = Path(__file__).with_name("focused_demo.json")
out.write_text(json.dumps(map_doc, indent=2))
print(f"wrote {out}")
