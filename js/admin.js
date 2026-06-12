(function () {
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive';

  const statusEl = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');
  const submissionsView = document.getElementById('submissionsView');
  const submissionsGrid = document.getElementById('submissionsGrid');

  let accessToken = null;
  let tokenClient = null;
  const gatedControls = []; // selects/buttons to enable once signed in

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', isError);
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
      onImageRendered: (item, img, cat) => {
        const controls = document.createElement('div');
        controls.className = 'admin-controls';

        const select = document.createElement('select');
        select.disabled = true;

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Move to…';
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        Gallery.categories.forEach((c) => {
          if (c.id === cat.id) return;
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.displayName;
          select.appendChild(opt);
        });

        const moveBtn = document.createElement('button');
        moveBtn.textContent = 'Move';
        moveBtn.disabled = true;
        moveBtn.addEventListener('click', () => moveImage(img, cat, select.value, item));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.className = 'delete-button';
        deleteBtn.disabled = true;
        deleteBtn.addEventListener('click', () => deleteImage(img, cat, item));

        controls.append(select, moveBtn, deleteBtn);
        item.appendChild(controls);

        gatedControls.push(select, moveBtn, deleteBtn);
      },
    }
  );

  async function moveImage(img, fromCat, toFolderId, item) {
    if (!toFolderId || toFolderId === fromCat.id) {
      setStatus('Please choose a cat to move this photo to.', true);
      return;
    }
    setStatus(`Moving "${img.name}"…`);
    try {
      const res = await fetch(
        `${DRIVE_API}/${img.id}?addParents=${toFolderId}&removeParents=${fromCat.id}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }
      const toCat = Gallery.categories.find((c) => c.id === toFolderId);
      fromCat.images = fromCat.images.filter((i) => i.id !== img.id);
      if (toCat) toCat.images.push(img);
      item.remove();
      setStatus(`Moved "${img.name}" to ${toCat ? toCat.displayName : 'the other folder'}.`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

  async function deleteImage(img, cat, item) {
    if (!confirm(`Move "${img.name}" to the Drive trash?`)) return;
    setStatus(`Deleting "${img.name}"…`);
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
      cat.images = cat.images.filter((i) => i.id !== img.id);
      item.remove();
      setStatus(`Moved "${img.name}" to the trash.`);
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

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
      renderSubmissions(data.files || []);
    } catch (err) {
      setStatus(`⚠️ Couldn't load new submissions: ${err.message}`, true);
    }
  }

  function renderSubmissions(files) {
    submissionsGrid.innerHTML = '';

    if (files.length === 0) {
      submissionsView.hidden = true;
      return;
    }

    files.forEach((img) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const thumb = document.createElement('img');
      thumb.src = img.thumbnailLink;
      thumb.alt = img.name;
      thumb.loading = 'lazy';
      item.appendChild(thumb);

      const controls = document.createElement('div');
      controls.className = 'admin-controls';

      const select = document.createElement('select');
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Assign to…';
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      Gallery.categories.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.displayName;
        select.appendChild(opt);
      });

      const moveBtn = document.createElement('button');
      moveBtn.textContent = 'Move';
      moveBtn.addEventListener('click', () => moveSubmission(img, select.value, item));

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete-button';
      deleteBtn.addEventListener('click', () => deleteSubmission(img, item));

      controls.append(select, moveBtn, deleteBtn);
      item.append(controls);
      submissionsGrid.appendChild(item);
    });

    submissionsView.hidden = false;
  }

  async function moveSubmission(img, toFolderId, item) {
    if (!toFolderId) {
      setStatus('Please choose a cat to assign this photo to.', true);
      return;
    }
    setStatus(`Adding "${img.name}"…`);
    try {
      const res = await fetch(
        `${DRIVE_API}/${img.id}?addParents=${toFolderId}&removeParents=${CONFIG.SUBMISSIONS_FOLDER_ID}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }
      const toCat = Gallery.categories.find((c) => c.id === toFolderId);
      if (toCat) toCat.images.push(img);
      item.remove();
      setStatus(`Added "${img.name}" to ${toCat ? toCat.displayName : 'the gallery'}.`);
      if (!submissionsGrid.children.length) submissionsView.hidden = true;
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

  async function deleteSubmission(img, item) {
    if (!confirm(`Move "${img.name}" to the Drive trash?`)) return;
    setStatus(`Deleting "${img.name}"…`);
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
      item.remove();
      setStatus(`Moved "${img.name}" to the trash.`);
      if (!submissionsGrid.children.length) submissionsView.hidden = true;
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
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
        setStatus('Signed in — you can now move or delete photos.');
        loadSubmissions();
      },
    });
  });

  Gallery.start();
})();
