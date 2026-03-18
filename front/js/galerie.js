// galerie.js

const images = document.querySelectorAll('.galerie-item');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.querySelector('.lightbox-img');
const closeBtn = document.querySelector('.lightbox .close');
const nextBtn = document.querySelector('.lightbox .next');
const prevBtn = document.querySelector('.lightbox .prev');

let currentIndex = 0;

images.forEach(img => {
  img.addEventListener('click', () => {
    currentIndex = parseInt(img.dataset.index);
    lightbox.style.display = 'flex';
    lightboxImg.src = images[currentIndex].src;
  });
});

closeBtn.addEventListener('click', () => lightbox.style.display = 'none');
nextBtn.addEventListener('click', () => {
  currentIndex = (currentIndex + 1) % images.length;
  lightboxImg.src = images[currentIndex].src;
});
prevBtn.addEventListener('click', () => {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  lightboxImg.src = images[currentIndex].src;
});

// navigation clavier
document.addEventListener('keydown', (e) => {
  if(lightbox.style.display === 'flex'){
    if(e.key === 'ArrowRight') nextBtn.click();
    if(e.key === 'ArrowLeft') prevBtn.click();
    if(e.key === 'Escape') closeBtn.click();
  }
});
let startX = 0;

lightboxImg.addEventListener("touchstart", e=>{
startX = e.touches[0].clientX;
});

lightboxImg.addEventListener("touchend", e=>{
let endX = e.changedTouches[0].clientX;

if(endX - startX > 50){
showPrev();
}

if(startX - endX > 50){
showNext();
}
});