# TenderGrove Bloom Procedural Art Kit

This kit is for rendering the household bloom in Ionic/React without needing one-off artwork for every household size.

## Files

- `petal_master_grayscale.png` - main watercolor petal. Tint this in code.
- `petal_alpha_mask.png` - alpha-only mask for SVG/canvas rendering.
- `petal_edge_bleed_mask_01.png` to `_03.png` - optional organic watercolor edge overlays.
- `petal_highlight_overlay.png` - optional soft light overlay.
- `petal_pigment_shadow_overlay.png` - optional depth/pigment overlay.
- `paper_grain_overlay.png` - optional full-card texture.
- `splatter_*` - optional watercolor atmosphere.
- `hub_leaf_filled.png`, `hub_leaf_plain.png`, `hub_ring_only.png` - center hub options.
- `leaf_accent_*` - decorative flourishes.
- `petal_preview_*` - previews only. Use the grayscale petal for real dynamic tinting.

## Bloom algorithm

For each household member:

```ts
angle = index * (360 / memberCount)
scale = 0.62 + (score / 100) * 0.38
opacity = 0.35 + (score / 100) * 0.45
```

Score color mapping:

```ts
score < 45  -> crisis coral
score < 70  -> watch gold
score >= 70 -> stable green
```

Render each petal around the center with `transform-origin: 50% 92%`.

For 1 member, render 3-4 ghost petals behind the real petal at low opacity so the screen still feels like a flower, not a single leaf.

For 8+ members, show every petal but only show avatar labels for members in crisis/watch state. Stable members can use smaller dots to avoid clutter.

For severe crisis, add a soft halo or pulse around the member avatar rather than making the whole design alarming.
