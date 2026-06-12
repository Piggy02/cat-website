# Our Cats 🐾

A simple static site that displays photos of your cats, pulled live from a
Google Drive folder. Each subfolder inside your "real" folder (Jasper, Boots,
Lily, Nibbles, Romeo, Spook & Billie, ...) becomes its own category/gallery.

## Setup

### 1. Get your folder ID

Open your "real" folder in Google Drive. The URL looks like:

```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz
```

The part after `/folders/` is your **folder ID**.

### 2. Share the folder publicly (view-only)

The site reads files via a public API key, so the folder (and its
subfolders/photos) must be viewable by anyone with the link:

1. Right-click the "real" folder → **Share**.
2. Under "General access", change to **"Anyone with the link"** → **Viewer**.
3. This normally applies to everything inside the folder too. If any
   subfolder was previously shared with different (more restrictive)
   settings, repeat step 2 for that subfolder.

### 3. Create a Google API key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or pick an existing one).
3. Go to **APIs & Services → Library**, search for **Google Drive API**, and
   click **Enable**.
4. Go to **APIs & Services → Credentials → Create Credentials → API key**.
5. Click on the new key to edit its restrictions:
   - **API restrictions** → restrict to **Google Drive API**.
   - **Application restrictions** → **Websites** → add your GitHub Pages URL,
     e.g. `https://yourusername.github.io/*` (and `http://localhost:*` if
     you want to test locally).

### 4. Configure the site

Open `js/config.js` and fill in your values:

```js
const CONFIG = {
  API_KEY: 'AIza...your-key...',
  ROOT_FOLDER_ID: '1AbCdEfGhIjKlMnOpQrStUvWxYz',
};
```

### 5. Run it

- **Locally**: just open `index.html` in a browser (or run a local server,
  e.g. `npx serve .`, especially if `http://localhost:*` is in your API key's
  allowed referrers).
- **GitHub Pages**: push this folder to a GitHub repo, then in
  **Settings → Pages**, set the source to your main branch (root). Your site
  will be live at `https://yourusername.github.io/<repo-name>/`.

## How it works

- On load, the site queries the Drive API for all subfolders inside
  `ROOT_FOLDER_ID` — each becomes a category (e.g. "Jasper", "Spook & Billie").
- For each subfolder, it lists all image files and displays them in a grid.
- Clicking a category (or its card on the home page) opens a gallery for that
  cat. Clicking a photo opens a full-size lightbox with prev/next navigation.
- Add or remove photos/folders in Drive and the site updates automatically —
  no rebuild needed.

## Notes

- New photos can take a few minutes to show up due to Drive/browser caching.
- If you see an error on the page, double-check the API key, folder ID, and
  sharing settings above.
