# Sound effects

Every sound is synthesized in `src/features/audio/synth.ts`, so this folder can
stay empty. To swap any of them for a recording, drop the file here and list it
in `manifest.json`:

```json
{ "win": "win.mp3", "coin": "coin.ogg" }
```

Names you can override: press, release, coin, start, clamp, open, thud, chute,
win, lose, door, ding, tick. The two motor loops are always synthesized because
they follow the claw's movement.

Check the license of anything you add (CC0 needs no credit, CC BY needs one).
