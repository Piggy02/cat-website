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

  Gallery.start();
})();
