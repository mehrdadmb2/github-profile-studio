# Profile Studio — GitHub Identity Builder

A GitHub Pages-first, client-side builder for professional GitHub Profile READMEs and developer identity pages.

## What it does

- Accepts any public GitHub username.
- Loads public profile and repository metadata from GitHub's API.
- Generates several profile README styles.
- Provides multiple visual themes.
- Lets you edit name, headline, bio, links, featured project signal, section order and donation blocks.
- Produces plain Markdown ready for a profile repository.
- Copies README.md to the clipboard or downloads it.
- Requires no backend, database, account system or build tool.
- Works on static GitHub Pages hosting.

## Run locally

Open `index.html` with a static server. For example:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080/`.

## Deploy to GitHub Pages

1. Create a new repository, recommended name: `github-profile-studio`.
2. Upload every file and folder from this package.
3. In GitHub: **Settings → Pages → Deploy from a branch**.
4. Choose `main` and `/root`.
5. Save.

## Important

GitHub's public REST API is rate limited. This project deliberately avoids secrets and authentication. For a personal static site this is usually sufficient; heavy public usage may require a server-side cache in a future version.

## Configure your own profile defaults

Edit `data/config.js` to change:

- Default username
- Social links
- Donation addresses
- Recommended theme
- Repository/brand defaults

## Repository name and description

Recommended repository name:

`github-profile-studio`

Recommended short description:

`Premium GitHub profile & README builder with live public profile data, themes, templates and Markdown export.`

## License

MIT — see `LICENSE`.
