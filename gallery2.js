// gallery.js
// Remplace TON_CLOUD_NAME par ton cloud name Cloudinary
const cloudName = "dx0mbjcva";

const galleryEl = document.getElementById("gallery");
const buttons = document.querySelectorAll(".gallery-menu button");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const closeBtn = document.querySelector("#lightbox .close");
const prevBtn = document.querySelector("#lightbox .prev");
const nextBtn = document.querySelector("#lightbox .next");

let currentImages = []; // [{thumb, full, caption}]
let currentIndex = 0;
let observer = null;

// Helper: build URLs robustly (use secure_url if present, else public_id+format)
function buildUrls(resource) {
  // full url
  let full;
  if (resource.secure_url) full = resource.secure_url;
  else full = `https://res.cloudinary.com/${cloudName}/image/upload/${resource.public_id}.${resource.format}`;

  // thumb: insert transformation for optimization (w_1000 for decent size, change as needed)
  if (full.includes("/upload/")) {
    const transform = "f_auto,q_auto,c_limit,w_1000/";
    const thumb = full.replace("/upload/", `/upload/${transform}`);
    // also produce an optimized large version for lightbox if needed (no width)
    const lightboxFull = full.replace("/upload/", "/upload/f_auto,q_auto/");
    return { thumb, full: lightboxFull, caption: resource.public_id.split("/").pop() };
  } else {
    // fallback
    return { thumb: full, full, caption: resource.public_id.split("/").pop() };
  }
}

// Load category/tag from Cloudinary
async function loadCategory(tag) {
  // highlight active button
  buttons.forEach(b => b.classList.toggle("active", b.getAttribute("data-tag") === tag));

  galleryEl.innerHTML = `<p style="text-align:center">Chargement...</p>`;

  try {
    const res = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`);
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const data = await res.json();

    if (!data.resources || !data.resources.length) {
      galleryEl.innerHTML = "<p style='text-align:center'>Aucune image trouvée pour cette catégorie.</p>";
      currentImages = [];
      return;
    }

    // build currentImages array
    currentImages = data.resources.map(r => buildUrls(r));

    // clear gallery
    galleryEl.innerHTML = "";

    // Destroy previous observer if any
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // Create items
    currentImages.forEach((imgObj, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-item";

      const imgEl = document.createElement("img");
      imgEl.dataset.src = imgObj.thumb; // lazy source
      imgEl.alt = imgObj.caption || `Image ${idx + 1}`;
      imgEl.dataset.index = idx;
      imgEl.loading = "lazy";

      // small placeholder to reserve layout (optional); keep empty src to avoid extra requests
      // imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

      wrapper.appendChild(imgEl);
      galleryEl.appendChild(wrapper);
    });

    // Setup IntersectionObserver for lazy loading
    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.addEventListener("load", () => img.classList.add("loaded"));
            // attach click for lightbox after src assigned
            img.addEventListener("click", () => openLightbox(parseInt(img.dataset.index, 10)));
          }
          obs.unobserve(img);
        }
      });
    }, {
      rootMargin: "200px 0px" // pre-load before image enters viewport
    });

    // Observe each image
    document.querySelectorAll(".gallery img").forEach(i => observer.observe(i));

  } catch (err) {
    console.error("Erreur Cloudinary:", err);
    galleryEl.innerHTML = "<p style='color:red;text-align:center'>Impossible de charger la galerie.</p>";
    currentImages = [];
  }
}

/* -------- Lightbox functions -------- */
function openLightbox(index) {
  if (!currentImages.length) return;
  currentIndex = index;
  updateLightbox();
  lightbox.style.display = "flex";
  document.body.style.overflow = "hidden"; // prevent background scroll
}

function updateLightbox() {
  const imgObj = currentImages[currentIndex];
  lightboxImg.src = imgObj.full;
  lightboxCaption.textContent = imgObj.caption || `${currentIndex + 1} / ${currentImages.length}`;
}

function closeLightbox() {
  lightbox.style.display = "none";
  lightboxImg.src = "";
  document.body.style.overflow = ""; // restore
}

function showPrev() {
  if (!currentImages.length) return;
  currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
  updateLightbox();
}

function showNext() {
  if (!currentImages.length) return;
  currentIndex = (currentIndex + 1) % currentImages.length;
  updateLightbox();
}

/* Close on click outside image */
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

/* Prev / Next / Close handlers */
prevBtn && prevBtn.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
nextBtn && nextBtn.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });
closeBtn && closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });

/* Keyboard navigation */
document.addEventListener("keydown", (e) => {
  if (lightbox.style.display === "flex") {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  }
});

/* Initialize: attach category buttons and load default */
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const tag = btn.getAttribute("data-tag");
    loadCategory(tag);
  });
});

// load default category (first button) or 'miniatures'
const defaultTag = (buttons[0] && buttons[0].getAttribute("data-tag")) || "miniatures";
loadCategory(defaultTag);
