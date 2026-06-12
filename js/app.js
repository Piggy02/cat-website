(async function () {
  const statusEl = document.getElementById('status');
  const homeView = document.getElementById('homeView');
  const galleryView = document.getElementById('galleryView');
  const galleryGrid = document.getElementById('galleryGrid');
  const galleryTitle = document.getElementById('galleryTitle');
  const backButton = document.getElementById('backButton');
  const categoryNav = document.getElementById('categoryNav');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const lightboxClose = lightbox.querySelector('.lightbox-close');
  const lightboxPrev = lightbox.querySelector('.lightbox-prev');
  const lightboxNext = lightbox.querySelector('.lightbox-next');

  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

  let categories = []; // [{ id, name, displayName, images: [{id, name, thumbnailLink}] }]
  let currentImages = [];
  let currentIndex = 0;

  function setStatus(msg, isError = false) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', isError);
  }

  function titleCase(str) {
    return str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  function bigImage(thumbnailLink) {
    if (!thumbnailLink) return '';
    return thumbnailLink.replace(/=s\d+$/, '=s1600');
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
    setStatus('Fetching your cats from Google Drive… 🐱');

    const folderData = await driveFetch(
      `'${CONFIG.ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      'files(id,name)'
    );

    if (!folderData.files || folderData.files.length === 0) {
      throw new Error('No subfolders found. Check ROOT_FOLDER_ID and that the folder is shared.');
    }

    categories = await Promise.all(
      folderData.files.map(async (folder) => {
        const imageData = await driveFetch(
          `'${folder.id}' in parents and mimeType contains 'image/' and trashed=false`,
          'files(id,name,thumbnailLink,mimeType)'
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

  function renderNav() {
    categoryNav.innerHTML = '';

    const homeBtn = document.createElement('button');
    homeBtn.textContent = '🏠 All Cats';
    homeBtn.className = 'active';
    homeBtn.addEventListener('click', () => showHome(homeBtn));
    categoryNav.appendChild(homeBtn);

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.textContent = cat.displayName;
      btn.addEventListener('click', () => showGallery(cat, btn));
      categoryNav.appendChild(btn);
    });
  }

  function setActiveNav(activeBtn) {
    categoryNav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  function renderHome() {
    homeView.innerHTML = '';
    categories.forEach((cat) => {
      const card = document.createElement('button');
      card.className = 'cat-card';

      const cover = document.createElement('img');
      cover.className = 'cover';
      cover.loading = 'lazy';
      cover.alt = cat.displayName;
      if (cat.images.length) {
        cover.src = cat.images[0].thumbnailLink;
      }

      const info = document.createElement('div');
      info.className = 'cat-info';
      const h3 = document.createElement('h3');
      h3.textContent = cat.displayName;
      const p = document.createElement('p');
      p.textContent = `${cat.images.length} photo${cat.images.length === 1 ? '' : 's'}`;
      info.append(h3, p);

      card.append(cover, info);
      card.addEventListener('click', () => {
        const navButtons = [...categoryNav.querySelectorAll('button')];
        const navBtn = navButtons.find((b) => b.textContent === cat.displayName);
        showGallery(cat, navBtn);
      });

      homeView.appendChild(card);
    });
  }

  function showHome(navBtn) {
    homeView.hidden = false;
    galleryView.hidden = true;
    setActiveNav(navBtn);
  }

  function showGallery(cat, navBtn) {
    galleryTitle.textContent = cat.displayName;
    galleryGrid.innerHTML = '';
    currentImages = cat.images;

    cat.images.forEach((img, idx) => {
      const el = document.createElement('img');
      el.loading = 'lazy';
      el.alt = img.name;
      el.src = img.thumbnailLink;
      el.addEventListener('click', () => openLightbox(idx));
      galleryGrid.appendChild(el);
    });

    if (cat.images.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No photos in this folder yet.';
      galleryGrid.appendChild(p);
    }

    homeView.hidden = true;
    galleryView.hidden = false;
    setActiveNav(navBtn);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxImage();
    lightbox.hidden = false;
  }

  function updateLightboxImage() {
    const img = currentImages[currentIndex];
    lightboxImg.src = bigImage(img.thumbnailLink) || img.thumbnailLink;
    lightboxImg.alt = img.name;
  }

  function closeLightbox() {
    lightbox.hidden = true;
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateLightboxImage();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateLightboxImage();
  }

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrev();
    if (e.key === 'ArrowRight') showNext();
  });

  backButton.addEventListener('click', () => {
    showHome(categoryNav.querySelector('button'));
  });

  if (CONFIG.SUBMIT_FORM_URL && !CONFIG.SUBMIT_FORM_URL.startsWith('YOUR_')) {
    const submitLink = document.getElementById('submitLink');
    submitLink.href = CONFIG.SUBMIT_FORM_URL;
    submitLink.hidden = false;
    document.getElementById('footerSeparator').hidden = false;
  }

  try {
    if (!CONFIG.API_KEY || CONFIG.API_KEY.startsWith('YOUR_') || !CONFIG.ROOT_FOLDER_ID || CONFIG.ROOT_FOLDER_ID.startsWith('YOUR_')) {
      throw new Error('Please set your API_KEY and ROOT_FOLDER_ID in js/config.js (see README.md).');
    }
    await loadAll();
    renderNav();
    renderHome();
    homeView.hidden = false;
  } catch (err) {
    setStatus(`⚠️ ${err.message}`, true);
  }
})();
