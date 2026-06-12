(function () {
  Gallery.init({
    status: document.getElementById('status'),
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
  });

  if (CONFIG.SUBMIT_FORM_URL && !CONFIG.SUBMIT_FORM_URL.startsWith('YOUR_')) {
    const submitLink = document.getElementById('submitLink');
    submitLink.href = CONFIG.SUBMIT_FORM_URL;
    submitLink.hidden = false;
    document.getElementById('footerSeparator').hidden = false;
  }

  Gallery.start();
})();
