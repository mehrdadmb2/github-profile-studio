# Setup & Customization

## 1. Upload

Upload the package exactly as provided. Do not move `data/`, `css/`, `js/` or `assets/` into different directories unless you also update the import paths.

## 2. GitHub Pages

Enable Pages from the `main` branch and repository root.

## 3. Default profile

Open `data/config.js` and update `defaultUsername`.

## 4. Donation addresses

The supplied config contains the public donation addresses currently shown in the referenced portfolio. Verify every address and network before publishing.

## 5. Adding a template

Add an object to `data/templates.js`:

```js
{ id:'my-template', name:'My Template', desc:'What it is for', sections:['hero','about','projects','stack','connect'] }
```

The renderer already knows the available section IDs.

## 6. Adding a theme

Add a theme object to `data/themes.js`:

```js
{ id:'my-theme', name:'My Theme', accent:'#7c5cff', accent2:'#26d9ff', bg:'#080b14' }
```

The UI automatically creates a theme swatch.
