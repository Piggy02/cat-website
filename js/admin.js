(function () {
  const statusEl = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  const adminGrid = document.getElementById('adminGrid');

  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive';

  let categories = []; // [{ id, name, displayName, images: [{id, name, thumbnailLink}] }]
  let accessToken = null;
  let tokenClient = null;

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', isError);
  }

  function titleCase(str) {
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  async function driveFetch(query, fields) {
    const url = `${DRIVE_API}?q=${encodeURIComponent(query)}&key=${CONFIG.API_KEY}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Drive API error (${res.status})`);
    }
    return res.json();
  }

  async function loadAll() {
    setStatus('Loading photos…');

    const folderData = await driveFetch(
      `'${CONFIG.ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      'files(id,name)'
    );

    categories = await Promise.all(
      (folderData.files || []).map(async (folder) => {
        const imageData = await driveFetch(
          `'${folder.id}' in parents and mimeType contains 'image/' and trashed=false`,
          'files(id,name,thumbnailLink)'
        );
        return {
          id: folder.id,
          name: folder.name,
          displayName: titleCase(folder.name),
          images: imageData.files || [],
        };
      })
    );

    categories.sort((a, b) => a.displayName.localeCompare(b.displayName));
    setStatus('');
  }

  function renderGrid() {
    adminGrid.innerHTML = '';

    categories.forEach((cat) => {
      cat.images.forEach((img) => {
        const card = document.createElement('div');
        card.className = 'admin-card';

        const thumb = document.createElement('img');
        thumb.src = img.thumbnailLink;
        thumb.alt = img.name;
        thumb.loading = 'lazy';

        const label = document.createElement('p');
        label.className = 'admin-card-cat';
        label.textContent = cat.displayName;

        const controls = document.createElement('div');
        controls.className = 'admin-controls';

        const select = document.createElement('select');
        categories.forEach((c) => {
          if (c.id === cat.id) return;
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.displayName;
          select.appendChild(opt);
        });

        const moveBtn = document.createElement('button');
        moveBtn.textContent = 'Move';
        moveBtn.disabled = !accessToken;
        moveBtn.addEventListener('click', () => moveImage(img, cat, select.value, card));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-button';
        deleteBtn.disabled = !accessToken;
        deleteBtn.addEventListener('click', () => deleteImage(img, card));

        controls.append(select, moveBtn, deleteBtn);
        card.append(thumb, label, controls);
        adminGrid.appendChild(card);
      });
    });

    if (categories.every((c) => c.images.length === 0)) {
      adminGrid.innerHTML = '<p>No photos found.</p>';
    }
  }

  async function moveImage(img, fromCat, toFolderId, card) {
    if (!toFolderId || toFolderId === fromCat.id) return;
    setStatus(`Moving ${img.name}…`);
    try {
      const res = await fetch(
        `${DRIVE_API}/${img.id}?addParents=${toFolderId}&removeParents=${fromCat.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }
      card.remove();
      setStatus(`Moved "${img.name}".`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

  async function deleteImage(img, card) {
    if (!confirm(`Move "${img.name}" to the Drive trash?`)) return;
    setStatus(`Deleting ${img.name}…`);
    try {
      const res = await fetch(`${DRIVE_API}/${img.id}`, {
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
      card.remove();
      setStatus(`Moved "${img.name}" to the trash.`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

  function enableControls() {
    adminGrid.querySelectorAll('select, button').forEach((el) => (el.disabled = false));
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
        enableControls();
        setStatus('Signed in — you can now move or delete photos.');
      },
    });
  });

  (async function init() {
    try {
      if (
        !CONFIG.API_KEY || CONFIG.API_KEY.startsWith('YOUR_') ||
        !CONFIG.ROOT_FOLDER_ID || CONFIG.ROOT_FOLDER_ID.startsWith('YOUR_')
      ) {
        throw new Error('Please set API_KEY and ROOT_FOLDER_ID in js/config.js.');
      }
      await loadAll();
      renderGrid();
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  })();
})();
