document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.querySelector(".gallery");
  const buttons = document.querySelectorAll(".gallery-menu button");

  const baseUrl = "https://res.cloudinary.com/dx0mbjcva/image/list/";

  let currentImages = []; // stocker les images de la catégorie courante
  let currentIndex = 0;

  function loadCategory(category) {
    gallery.innerHTML = "<p>Chargement...</p>";

    fetch(`${baseUrl}${category}.json`)
      .then(res => res.json())
      .then(data => {
        gallery.innerHTML = "";
        currentImages = data.resources.map(img =>
          img.secure_url.replace("/upload/", "/upload/f_auto,q_auto/")
        );

        currentImages.forEach((url, index) => {
          const imgElement = document.createElement("img");
          imgElement.dataset.src = url;
          imgElement.dataset.index = index;
          imgElement.alt = "Image " + (index + 1);
          gallery.appendChild(imgElement);
        });

        // Lazy loading
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              img.src = img.dataset.src;
              img.onload = () => img.classList.add("loaded");
              obs.unobserve(img);
            }
          });
        });

        document.querySelectorAll(".gallery img").forEach(img => {
          observer.observe(img);
          img.addEventListener("click", openLightbox);
        });
      })
      .catch(err => {
        console.error("Erreur Cloudinary :", err);
        gallery.innerHTML = "<p>Impossible de charger la galerie.</p>";
      });
  }

  // ---------------- LIGHTBOX ----------------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.querySelector(".lightbox-img");
  const closeBtn = document.querySelector(".lightbox .close");
  const prevBtn = document.querySelector(".lightbox .prev");
  const nextBtn = document.querySelector(".lightbox .next");

  function openLightbox(e) {
    currentIndex = parseInt(e.target.dataset.index, 10);
    showImage(currentIndex);
    lightbox.style.display = "flex";
  }

  function closeLightbox() {
    lightbox.style.display = "none";
  }

  function showImage(index) {
    if (index < 0) index = currentImages.length - 1;
    if (index >= currentImages.length) index = 0;
    currentIndex = index;
    lightboxImg.src = currentImages[currentIndex];
  }

  prevBtn.addEventListener("click", () => showImage(currentIndex - 1));
  nextBtn.addEventListener("click", () => showImage(currentIndex + 1));
  closeBtn.addEventListener("click", closeLightbox);

  // Fermer avec la touche Échap
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
  });

  // Par défaut : miniatures
  loadCategory("miniatures");

  // Changement de catégorie au clic
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      loadCategory(btn.dataset.category);
    });
  });
});
