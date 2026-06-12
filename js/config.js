// Fill these in with your own values — see README.md for step-by-step instructions.
const CONFIG = {
  // A Google API key with the "Google Drive API" enabled, restricted by HTTP referrer.
  API_KEY: 'AIzaSyDZLdad_upecndHNynq4dYcKMWLriVSisY',

  // The folder ID of your "real" folder (the one containing Jasper, Boots, Lily, etc.)
  // Found in the Drive URL: https://drive.google.com/drive/folders/<THIS_PART>
  ROOT_FOLDER_ID: '1uTx-55Vw_cM0h2DAzmfhaylm4AC9ioBR',

  // OAuth 2.0 Client ID (Web application) used by admin.html to sign in and
  // move/delete photos. Create one in Cloud Console under Credentials.
  CLIENT_ID: '805067828054-9upnf075oks00khnvf2jkn20hko99i3o.apps.googleusercontent.com',

  // The folder ID where the Google Form saves uploaded photos (the
  // "[Form Title] (File responses)" folder in My Drive). Used by admin.html
  // to show new submissions for sorting. Leave as-is to hide that section.
  SUBMISSIONS_FOLDER_ID: 'YOUR_SUBMISSIONS_FOLDER_ID',

  // Google account email addresses allowed to use the admin panel. Anyone
  // else who signs in will be signed back out immediately. Lowercase.
  ALLOWED_EMAILS: [
    'demson6733@gmail.com',
    'cjdemson07@gmail.com',
    'abbyjodem@gmail.com',
    'rhia2836@gmail.com',
    'jacobabyss@googlemail.com',
  ],
};
