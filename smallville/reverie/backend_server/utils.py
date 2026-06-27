# Setup file required by upstream Smallville. Normally each user creates this
# hand with their OpenAI key; we back it with env vars so no secrets are
# committed. See smallville/README.md (Step 1) for the upstream template.
import os

openai_api_key = os.environ.get("MESHAPI_API_KEY", os.environ.get("OPENAI_API_KEY", ""))
key_owner = os.environ.get("KEY_OWNER", "smart-npc-demo")

maze_assets_loc = "../../environment/frontend_server/static_dirs/assets"
env_matrix = f"{maze_assets_loc}/the_ville/matrix"
env_visuals = f"{maze_assets_loc}/the_ville/visuals"

fs_storage = "../../environment/frontend_server/storage"
fs_temp_storage = "../../environment/frontend_server/temp_storage"

collision_block_id = "32125"

# Verbose
debug = True