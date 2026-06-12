(function () {
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive';

  const statusEl = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  const submissionsView = document.getElementById('submissionsView');
  const submissionsGrid = document.getElementById('submissionsGrid');
  const bulkBar = document.getElementById('bulkBar');
  const bulkCount = document.getElementById('bulkCount');
  const bulkMoveSelect = document.getElementById('bulkMoveSelect');
  const bulkMoveButton = document.getElementById('bulkMoveButton');
  const bulkDeleteButton = document.getElementById('bulkDeleteButton');
  const bulkClearButton = document.getElementById('bulkClearButton');
  const uploadCategorySelect = document.getElementById('uploadCategorySelect');
  const uploadInput = document.getElementById('uploadInput');
  const uploadButton = document.getElementById('uploadButton');

  let accessToken = null;
  let tokenClient = null;
  let submissionImages = [];
  const gatedControls = [
    bulkMoveSelect,
    bulkMoveButton,
    bulkDeleteButton,
    uploadCategorySelect,
    uploadInput,
    uploadButton,
  ]; // enabled once signed in
  const selected = new Map(); // image id -> { img, item, fromFolderId, list }

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', isError);
  }

  function updateBulkBar() {
    const count = selected.size;
    bulkBar.hidden = count === 0;
    bulkCount.textContent = `${count} photo${count === 1 ? '' : 's'} selected`;
  }

  function createSelectControl(img, fromFolderId, item, list) {
    const label = document.createElement('label');
    label.className = 'select-control';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.disabled = !accessToken;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.set(img.id, { img, item, fromFolderId, list });
      } else {
        selected.delete(img.id);
      }
      updateBulkBar();
    });

    label.append(checkbox, document.createTextNode('Select'));
    gatedControls.push(checkbox);
    return label;
  }

  Gallery.init(
    {
      status: statusEl,
      homeView: document.getElementById('homeView'),
      galleryView: document.getElementById('galleryView'),
      galleryGrid: document.getElementById('galleryGrid'),
      galleryTitle: document.getElementById('galleryTitle'),
      backButton: document.getElementById('backButton'),
      categoryNav: document.getElementById('categoryNav'),
      lightbox: document.getElementById('lightbox'),
      lightboxImg: document.querySelector('#lightbox .lightbox-img'),
      lightboxClose: document.querySelector('#lightbox .lightbox-close'),
      lightboxPrev: document.querySelector('#lightbox .lightbox-prev'),
      lightboxNext: document.querySelector('#lightbox .lightbox-next'),
    },
    {
      onReady: () => {
        Gallery.categories.forEach((c) => {
          const moveOpt = document.createElement('option');
          moveOpt.value = c.id;
          moveOpt.textContent = c.displayName;
          bulkMoveSelect.appendChild(moveOpt);

          const uploadOpt = document.createElement('option');
          uploadOpt.value = c.id;
          uploadOpt.textContent = c.displayName;
          uploadCategorySelect.appendChild(uploadOpt);
        });
      },
      onImageRendered: (item, img, cat) => {
        item.appendChild(createSelectControl(img, cat.id, item, cat.images));
      },
    }
  );

  function uncheckEntry(entry) {
    const checkbox = entry.item.querySelector('.select-control input');
    if (checkbox) checkbox.checked = false;
    selected.delete(entry.img.id);
  }

  async function bulkMove() {
    const destId = bulkMoveSelect.value;
    if (!destId) {
      setStatus('Please choose a cat to move the selected photos to.', true);
      return;
    }
    const entries = [...selected.values()];
    if (entries.length === 0) return;

    const destCat = Gallery.categories.find((c) => c.id === destId);
    const count = entries.length;
    if (!confirm(`Move ${count} photo${count === 1 ? '' : 's'} to ${destCat.displayName}?`)) return;

    setStatus(`Moving ${count} photo${count === 1 ? '' : 's'}…`);
    for (const entry of entries) {
      if (entry.fromFolderId === destId) {
        uncheckEntry(entry);
        continue;
      }
      try {
        const res = await fetch(
          `${DRIVE_API}/${entry.img.id}?addParents=${destId}&removeParents=${entry.fromFolderId}`,
          { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || `Error ${res.status}`);
        }
        const idx = entry.list.indexOf(entry.img);
        if (idx !== -1) entry.list.splice(idx, 1);
        destCat.images.push(entry.img);
        entry.item.remove();
        selected.delete(entry.img.id);
      } catch (err) {
        setStatus(`⚠️ ${err.message}`, true);
        updateBulkBar();
        return;
      }
    }
    setStatus(`Moved ${count} photo${count === 1 ? '' : 's'} to ${destCat.displayName}.`);
    bulkMoveSelect.value = '';
    updateBulkBar();
    Gallery.renderHome();
    if (!submissionsGrid.children.length) submissionsView.hidden = true;
  }

  async function bulkDelete() {
    const entries = [...selected.values()];
    if (entries.length === 0) return;

    const count = entries.length;
    if (!confirm(`Move ${count} photo${count === 1 ? '' : 's'} to the Drive trash?`)) return;

    setStatus(`Deleting ${count} photo${count === 1 ? '' : 's'}…`);
    for (const entry of entries) {
      try {
        const res = await fetch(`${DRIVE_API}/${entry.img.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trashed: true }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || `Error ${res.status}`);
        }
        const idx = entry.list.indexOf(entry.img);
        if (idx !== -1) entry.list.splice(idx, 1);
        entry.item.remove();
        selected.delete(entry.img.id);
      } catch (err) {
        setStatus(`⚠️ ${err.message}`, true);
        updateBulkBar();
        return;
      }
    }
    setStatus(`Moved ${count} photo${count === 1 ? '' : 's'} to the trash.`);
    updateBulkBar();
    Gallery.renderHome();
    if (!submissionsGrid.children.length) submissionsView.hidden = true;
  }

  function clearSelection() {
    [...selected.values()].forEach(uncheckEntry);
    updateBulkBar();
  }

  bulkMoveButton.addEventListener('click', bulkMove);
  bulkDeleteButton.addEventListener('click', bulkDelete);
  bulkClearButton.addEventListener('click', clearSelection);

  async function uploadFile(file, destId) {
    const boundary = 'cat-website-boundary';
    const metadata = { name: file.name, parents: [destId] };
    const fileData = await file.arrayBuffer();

    const body = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      fileData,
      `\r\n--${boundary}--`,
    ]);

    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${encodeURIComponent('id,name,thumbnailLink')}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Error ${res.status}`);
    }
    return res.json();
  }

  async function uploadPhotos() {
    const destId = uploadCategorySelect.value;
    if (!destId) {
      setStatus('Please choose a cat to add the photo(s) to.', true);
      return;
    }
    const files = [...uploadInput.files];
    if (files.length === 0) {
      setStatus('Please choose one or more photos to upload.', true);
      return;
    }

    const destCat = Gallery.categories.find((c) => c.id === destId);
    const count = files.length;
    setStatus(`Uploading ${count} photo${count === 1 ? '' : 's'}…`);

    for (const file of files) {
      try {
        const uploaded = await uploadFile(file, destId);
        destCat.images.push({
          id: uploaded.id,
          name: uploaded.name,
          thumbnailLink: uploaded.thumbnailLink,
        });
      } catch (err) {
        setStatus(`⚠️ ${err.message}`, true);
        return;
      }
    }

    uploadInput.value = '';
    clearSelection();
    if (Gallery.currentCategory && Gallery.currentCategory.id === destId) {
      Gallery.renderCategory(destCat);
    }
    Gallery.renderHome();
    setStatus(
      `Added ${count} photo${count === 1 ? '' : 's'} to ${destCat.displayName}. ` +
        `New thumbnails can take a minute to appear — reload the page if they look blank.`
    );
  }

  uploadButton.addEventListener('click', uploadPhotos);

  async function loadSubmissions() {
    if (!CONFIG.SUBMISSIONS_FOLDER_ID || CONFIG.SUBMISSIONS_FOLDER_ID.startsWith('YOUR_')) return;

    try {
      const query = `'${CONFIG.SUBMISSIONS_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`;
      const url = `${DRIVE_API}?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('files(id,name,thumbnailLink)')}&pageSize=1000&orderBy=createdTime desc`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }
      const data = await res.json();
      submissionImages = data.files || [];
      renderSubmissions();
    } catch (err) {
      setStatus(`⚠️ Couldn't load new submissions: ${err.message}`, true);
    }
  }

  function renderSubmissions() {
    submissionsGrid.innerHTML = '';

    if (submissionImages.length === 0) {
      submissionsView.hidden = true;
      return;
    }

    submissionImages.forEach((img) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const thumb = document.createElement('img');
      thumb.src = img.thumbnailLink;
      thumb.alt = img.name;
      thumb.loading = 'lazy';
      item.appendChild(thumb);

      item.appendChild(createSelectControl(img, CONFIG.SUBMISSIONS_FOLDER_ID, item, submissionImages));

      submissionsGrid.appendChild(item);
    });

    submissionsView.hidden = false;
  }

  signInButton.addEventListener('click', () => {
    if (!tokenClient) {
      setStatus('Google sign-in is still loading — please wait a moment and try again.', true);
      return;
    }
    tokenClient.requestAccessToken();
  });

  window.addEventListener('load', () => {
    if (!window.google?.accounts?.oauth2) {
      setStatus('Failed to load Google sign-in.', true);
      return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          setStatus(`⚠️ ${response.error}`, true);
          return;
        }
        accessToken = response.access_token;
        signInButton.textContent = 'Signed in ✓';
        signInButton.disabled = true;
        gatedControls.forEach((el) => (el.disabled = false));
        setStatus('Signed in — select photos to move or delete them.');
        loadSubmissions();
      },
    });
  });

  Gallery.start();
})();
