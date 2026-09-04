# ProfileForge Setup

## GitHub Pages
1. Create a public repository, recommended name: `github-profile-studio`.
2. Upload the contents of this folder to `main`.
3. Settings → Pages → Deploy from a branch → `main` / `/root`.
4. Open the generated Pages URL.

## Generator usage
1. Enter any public GitHub username.
2. Click scan.
3. Choose a goal, template, theme and visuals.
4. Edit the headline, about text, links and project selection.
5. Use Preview / GitHub view / Markdown tabs.
6. Download README.md and the SVG assets needed by your selected visual system.

## Profile README publishing
Create a repository whose name exactly matches the target GitHub username. Place the generated `README.md` at the repository root. Upload the downloaded `assets/` files too.

## Optional automation
The included `.github/workflows/update-profile.yml` refreshes the contribution asset and rewrites a compact snapshot README weekly. Customize `scripts/build-profile.mjs` to preserve your hand-written README sections instead of overwriting the file.

## Important GitHub API note
The studio uses the unauthenticated public GitHub REST API from the browser. Heavy usage can hit the public rate limit. For large deployments, add a server-side cache or GitHub App.
