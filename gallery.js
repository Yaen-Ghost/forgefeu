const cloudName = "TON_CLOUD_NAME"; // 🔹 remplace par ton Cloudinary
const galleryEl = document.getElementById("gallery");

let currentImages = [];
let currentIndex = 0;

// Charger la galerie depuis Cloudinary
async function loadGallery(tag) {
  galleryEl.innerHTML = "<p>Chargement...</p>";
  try {
    const res = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`);
    const data = await res.json();
    currentImages = data.resources;

    galleryEl.innerHTML = currentImages.map((img, i) => `
      <img src="${img.secure_url}" 
           alt="${img.public_id}" 
           loading="lazy" 
           data-index="${i}">
    `).join("");
  } catch (err) {
    galleryEl.innerHTML = "<p>Impossible de charger les images.</p>";
    console.error(err);
  }
}

// Gestion du menu
document.querySelectorAll(".gallery-menu button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tag = btn.getAttribute("data-tag");
    loadGallery(tag);
  });
});

// Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");

galleryEl.addEventListener("click", e => {
  if (e.target.tagName === "IMG") {
    currentIndex = parseInt(e.target.dataset.index);
    showLightbox();
  }
});

function showLightbox() {
  const img = currentImages[currentIndex];
  lightboxImg.src = img.secure_url;
  lightboxCaption.textContent = img.public_id;
  lightbox.style.display = "flex";
}

document.querySelector(".close").addEventListener("click", () => {
  lightbox.style.display = "none";
});

document.querySelector(".prev").addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
  showLightbox();
});

document.querySelector(".next").addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % currentImages.length;
  showLightbox();
});

// Charger par défaut "miniatures"
loadGallery("miniatures");
