# Brand marks for the back plaque

The plaque on the back of the cabinet has two wells, one per file name:

- `solana`      left well
- `magicblock`  right well

For each, the game looks for `<name>.svg` first and inlays it as raised gold
geometry (see `features/cabinet/parts/Engraving.tsx`). If there is no SVG it
looks for `<name>.png`: a flat light-on-dark image is used as a stencil and set
in the same gold (padding is trimmed), anything else is shown as a printed badge. With neither, the
well stays empty.

Use the official files from each project's press kit and follow their usage
terms. SVG notes: filled paths only (strokes are ignored), and a full-bleed
background rectangle is dropped automatically. An SVG gives the crispest edges up close.
