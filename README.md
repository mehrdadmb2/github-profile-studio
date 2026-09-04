# GitSkins Studio — README Builder

A self-contained GitHub Pages README/Profile builder inspired by modern README Studio workflows. It is a clean-room implementation of the public interaction model: username scan, goal presets, skin templates, visual library, live preview, section timeline, inspector controls, local autosave, and Markdown export.

## Run on GitHub Pages

1. Create a repository named `github-profile-studio` (or any name you like).
2. Upload `index.html`.
3. GitHub → Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
4. Open the generated Pages URL.

No Node.js, build step, API key, or backend is required.

## Public data

The app reads public profile/repository data from the GitHub REST API in the visitor's browser. Contribution history is optionally read from `github-contributions-api.jogruber.de` because GitHub's REST API does not expose the profile contribution graph directly. Both sources are public; the contribution service documents hourly caching and rate limits.

## Included studio surface

- Profile / Visuals / Links navigation
- 20 skin themes matching the public GitSkins theme catalogue names and accent palette
- 7 README goals
- 9 README sections + optional Streak/Support
- Visual library: Hero, 3D Wordmark, ASCII Portrait, Chess, Space Shooter, Snake Trail, Erased, Jet Runner, Contribution Streak
- Live Preview / GitHub view / Markdown view
- Section reorder/remove/add controls
- Content / Style / Agent inspector tabs
- Local autosave via `localStorage`
- Downloadable `README.md`
- Copy-to-clipboard export
- Responsive layout for desktop/tablet/mobile

## Important

This project intentionally does not copy Gitskins' private source code or proprietary assets. It recreates the public information architecture, interaction patterns, theme names/palette, and studio-style workflow as a clean-room implementation.
