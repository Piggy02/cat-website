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

### 5. (Optional) Set up the "Manage Photos" admin tool

`admin.html` lets signed-in admins:

- **Add photos** — pick a cat from the "Add to…" dropdown near the top, choose
  one or more image files, and click **Upload** to add them straight to that
  cat's folder in Drive.
- **Move or delete photos** — select photos with checkboxes, then use the
  toolbar at the bottom of the page to move the selected photos to a different
  cat folder or delete them (moves them to Drive's trash, recoverable for 30
  days). Both actions ask for confirmation before running.

1. In Cloud Console, go to **APIs & Services → OAuth consent screen**.
   - User type: **External** (or Internal if you use Google Workspace).
   - Fill in an app name (e.g. "Cat Website Admin") and a support email.
   - Under **Test users**, add the Google account email of anyone who should
     be able to manage photos. While the app is in "Testing" status, only
     these accounts can sign in — no full Google app verification needed.
2. Go to **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**.
   - Application type: **Web application**.
   - Authorized JavaScript origins: `https://yourusername.github.io` (no
     trailing slash or path).
   - Click **Create** and copy the **Client ID**.
3. Paste it into `js/config.js` as `CLIENT_ID`.
4. Open `admin.html`, click **Sign in with Google**, and approve access. You
   may see an "unverified app" warning — click **Advanced → Go to [app
   name]**, since this is your own app and you're a test user.

### 6. (Optional) Add a "Submit a photo" link for visitors

1. Create a [Google Form](https://forms.google.com) with:
   - A "Which cat is this?" question (multiple choice/dropdown, one option
     per cat folder name).
   - A "Photo" question of type **File upload**.
2. Click **Send** and copy the form's link.
3. Paste it into `js/config.js` as `SUBMIT_FORM_URL`. A "📷 Submit a photo"
   link will appear in the site footer.
4. Submit a test photo through the form (so Drive creates the responses
   folder). In Drive's "My Drive", find the new folder named something like
   *"[Your Form Title] (File responses)"*, open it, and copy the folder ID
   from its URL (`https://drive.google.com/drive/folders/<THIS_PART>`).
5. Paste it into `js/config.js` as `SUBMISSIONS_FOLDER_ID`.
6. On `admin.html`, after signing in, a **"New Submissions"** section appears
   at the top (if there are any) — select photos and use the toolbar at the
   bottom to move them into a cat's folder or delete them.

### 7. Run it

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
- `admin.html` (if configured) lets signed-in admins upload new photos
  directly to a cat's folder, and select multiple photos to move them between
  cats or send them to the trash, directly from the site, with a confirmation
  step before each bulk action.
- If `SUBMIT_FORM_URL` is configured, a "📷 Submit a photo" link appears in
  the footer for visitors to add new photos via a Google Form.

## Notes

- New photos can take a few minutes to show up due to Drive/browser caching.
- If you see an error on the page, double-check the API key, folder ID, and
  sharing settings above.
