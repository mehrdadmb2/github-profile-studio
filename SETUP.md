# Setup & Publish

## 1. Create the repository

Recommended repository name:

`github-profile-studio`

Short description:

> Premium GitHub profile & README builder with live public profile data, themes, templates and Markdown export.

## 2. Upload

Upload the contents of this folder to the `main` branch.

No Node.js, npm, build command, server, database or secret is required.

## 3. Enable GitHub Pages

Open:

`Settings → Pages → Build and deployment → Deploy from a branch → main → / (root) → Save`

## 4. Customize the default profile

Edit `js/config.js`:

- `defaultUsername`
- donation wallet addresses
- donation default behavior

The donation addresses included in the default configuration are the public addresses from the existing Mehrdad portfolio. Verify every address and network before publishing.

## 5. What the app does

1. User enters a public GitHub username.
2. Browser calls GitHub's public REST API.
3. Profile and up to 300 repositories are loaded.
4. Repository stars and language signals are computed locally.
5. The template and theme are rendered in the live preview.
6. The final README is generated locally.
7. User can copy or download `README.md`.

## Troubleshooting

### GitHub API rate limit

The app shows the public API remaining quota in the scan card. Retry later if the quota is exhausted.

### CORS / local testing

GitHub API supports browser access to these public endpoints. For consistent local testing, serve the folder over HTTP instead of opening `index.html` directly, for example:

```bash
python -m http.server 8080
```

then open `http://localhost:8080`.
