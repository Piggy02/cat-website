(function () {
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
  const SCOPE = 'https://www.googleapis.com/auth/drive';

  const statusEl = document.getElementById('status');
  const signInButton = document.getElementById('signInButton');

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
    if (!toFolderId || toFolderId === fromCat.id) return;
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
      },
    });
  });

  Gallery.start();
})();
