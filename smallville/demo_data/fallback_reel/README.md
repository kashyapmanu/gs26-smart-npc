# Fallback Reel

Record this only AFTER the live demo works end-to-end (so the reel shows real
LLM-generated lines, not canned ones).

## Steps
1. Run the full live demo with a warm, real LLM provider (export `MESHAPI_API_KEY`
   and `OPENROUTER_API_KEY`); record the screen with OBS or QuickTime.
2. Trim to ~90 seconds covering all three beats (rescue → propagation via the
   overlay panel → restaurant callback).
3. Export as `fallback_reel.mp4` in this directory.
4. Keep a player (VLC or QuickTime) open with the file loaded, paused at 0:00,
   ready to switch to if the live demo fails on stage.

## Switching to the reel

If during judging the feed overlay shows `feed stream interrupted — retrying...`
for more than 5 seconds OR a `safe_chat_completion` error appears in the backend
log, IMMEDIATELY switch the projector to the player with `fallback_reel.mp4`
playing from 0:00. Do not narrate the switch — pause for a beat, then continue
explaining what the reel shows (the same three beats) once it's playing smoothly.

## When the reel is NOT appropriate

- Switching back to live is fine mid-judging if a network issue resolves.
- The reel is the LAST resort — the live demo is always preferred.