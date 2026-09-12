# Living Tree — Cride

An English-language, static 3D engineering portfolio. Native scroll controls a reversible camera/growth timeline. Eight Markdown project entries also compile into a standalone, JavaScript-free reading page.

## Development

Requires Node.js 22. Install with `npm ci`, run `npm run dev`, and create a validated static build with `npm run build`. Run `npm test` for timeline, asset, content, and adaptive-quality contract tests. The existing Minecraft page is copied byte-for-byte to `/mc/` during the build.

## Editing

- `content/`: project Markdown and front matter; `npm run build` recompiles it.
- `src/scene/timeline.mjs`: desktop and separately authored portrait camera compositions.
- `tools/create-tree.py`: original, reference-informed Blender authoring. Run with Blender 4.5 in background mode, then `node tools/optimize-assets.mjs`.
- `assets-source/living-tree.blend`: editable hero source. Browser assets are under `public/assets/`.
- `tools/create-bark.py`: original texture generation; encode the normal map with the pinned Basis Universal encoder and keep the checked-in KTX2/mipmap output.

The source of the visual reference is documented in `docs/asset-provenance.md`. The CGTrader model itself is not included.

## Release

`dist/` is the public static build. `.openai/hosting.json` identifies the registered Sites project. No backend or environment secrets are required. Root hosting is also compatible with GitHub Pages when publishing the build directory through a Pages workflow; do not publish the unbuilt source root.

See `docs/migration.md` for the original site revision and recovery branch, and `docs/verification.md` for verification scope and limits.
