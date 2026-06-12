// Shared gallery logic used by both index.html and admin.html.
// Handles loading categories/images from Drive, rendering the category nav,
// home grid, per-category gallery, and lightbox. Callers can pass an
// `onImageRendered(itemEl, image, category)` hook to add extra UI (e.g. the
// admin move/delete controls) to each photo in the gallery grid.
const Gallery = (() => {
  const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

  let categories = []; // [{ id, name, displayName, images: [{id, name, thumbnailLink}] }]
  let currentImages = [];
  let currentIndex = 0;
  let dom = {};
  let hooks = {};

  function setStatus(msg, isError = false) {
    dom.status.textContent = msg;
    dom.status.classList.toggle('error', isError);
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

  async function load() {
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
    dom.categoryNav.innerHTML = '';

    const homeBtn = document.createElement('button');
    homeBtn.textContent = '🏠 All Cats';
    homeBtn.className = 'active';
    homeBtn.addEventListener('click', () => showHome(homeBtn));
    dom.categoryNav.appendChild(homeBtn);

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.textContent = cat.displayName;
      btn.addEventListener('click', () => showGallery(cat, btn));
      dom.categoryNav.appendChild(btn);
    });
  }

  function setActiveNav(activeBtn) {
    dom.categoryNav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
  }

  function renderHome() {
    dom.homeView.innerHTML = '';
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
        const navButtons = [...dom.categoryNav.querySelectorAll('button')];
        const navBtn = navButtons.find((b) => b.textContent === cat.displayName);
        showGallery(cat, navBtn);
      });

      dom.homeView.appendChild(card);
    });
  }

  function showHome(navBtn) {
    dom.homeView.hidden = false;
    dom.galleryView.hidden = true;
    setActiveNav(navBtn);
  }

  function showGallery(cat, navBtn) {
    dom.galleryTitle.textContent = cat.displayName;
    dom.galleryGrid.innerHTML = '';
    currentImages = cat.images;

    cat.images.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';

      const el = document.createElement('img');
      el.loading = 'lazy';
      el.alt = img.name;
      el.src = img.thumbnailLink;
      el.addEventListener('click', () => openLightbox(idx));
      item.appendChild(el);

      if (hooks.onImageRendered) {
        hooks.onImageRendered(item, img, cat);
      }

      dom.galleryGrid.appendChild(item);
    });

    if (cat.images.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No photos in this folder yet.';
      dom.galleryGrid.appendChild(p);
    }

    dom.homeView.hidden = true;
    dom.galleryView.hidden = false;
    setActiveNav(navBtn);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openLightbox(index) {
    currentIndex = index;
    updateLightboxImage();
    dom.lightbox.hidden = false;
  }

  function updateLightboxImage() {
    const img = currentImages[currentIndex];
    dom.lightboxImg.src = bigImage(img.thumbnailLink) || img.thumbnailLink;
    dom.lightboxImg.alt = img.name;
  }

  function closeLightbox() {
    dom.lightbox.hidden = true;
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateLightboxImage();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateLightboxImage();
  }

  function init(domRefs, h = {}) {
    dom = domRefs;
    hooks = h;

    dom.lightboxClose.addEventListener('click', closeLightbox);
    dom.lightboxPrev.addEventListener('click', showPrev);
    dom.lightboxNext.addEventListener('click', showNext);
    dom.lightbox.addEventListener('click', (e) => {
      if (e.target === dom.lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (dom.lightbox.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    });

    dom.backButton.addEventListener('click', () => {
      showHome(dom.categoryNav.querySelector('button'));
    });
  }

  async function start() {
    try {
      if (
        !CONFIG.API_KEY || CONFIG.API_KEY.startsWith('YOUR_') ||
        !CONFIG.ROOT_FOLDER_ID || CONFIG.ROOT_FOLDER_ID.startsWith('YOUR_')
      ) {
        throw new Error('Please set your API_KEY and ROOT_FOLDER_ID in js/config.js (see README.md).');
      }
      await load();
      renderNav();
      renderHome();
      dom.homeView.hidden = false;
    } catch (err) {
      setStatus(`⚠️ ${err.message}`, true);
    }
  }

  return {
    init,
    start,
    get categories() {
      return categories;
    },
  };
})();
