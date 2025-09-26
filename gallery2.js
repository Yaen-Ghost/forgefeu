// gallery2.js (remplace entièrement ton fichier)
// Remplace dx0mbjcva par ton cloud name déjà présent si besoin
const cloudName = "dx0mbjcva";

const galleryEl = document.getElementById("gallery");
const buttonNodes = document.querySelectorAll(".gallery-menu button");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const closeBtn = document.querySelector("#lightbox .close");
const prevBtn = document.querySelector("#lightbox .prev");
const nextBtn = document.querySelector("#lightbox .next");

let currentImages = []; // [{thumb, full, caption}]
let currentIndex = 0;
let observer = null;

/* ---------- Helpers ---------- */
function extractTagFromButton(btn) {
  // 1) data-tag attribute
  let tag = btn.getAttribute("data-tag");
  if (tag) return tag.trim();

  // 2) onclick inline like: loadGallery('miniatures')
  const onclick = btn.getAttribute("onclick");
  if (onclick) {
    const m = onclick.match(/loadGallery\(['"]([^'"]+)['"]\)/);
    if (m && m[1]) return m[1];
  }

  // 3) fallback: try dataset.tag (same as data-tag) or button text (less reliable)
  if (btn.dataset && btn.dataset.tag) return btn.dataset.tag.trim();
  // fallback to sanitized text (only if nothing else)
  return btn.textContent.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildUrls(resource) {
  // build full url (prefer secure_url)
  const fullBase = resource.secure_url ?
    resource.secure_url :
    `https://res.cloudinary.com/${cloudName}/image/upload/${resource.public_id}.${resource.format}`;

  // create optimized thumb and optimized full
  if (fullBase.includes("/upload/")) {
    const thumb = fullBase.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_300/");
    const full = fullBase.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1600/");
    return { thumb, full, caption: resource.public_id.split("/").pop() };
  }
  return { thumb: fullBase, full: fullBase, caption: resource.public_id.split("/").pop() };
}

/* ---------- Main loader ---------- */
async function loadCategory(tag) {
  if (!tag) tag = "miniatures"; // sécurité si tag absent
  // update active state on buttons
  buttonNodes.forEach(b => {
    const bTag = b.getAttribute("data-tag") || extractTagFromButton(b);
    b.classList.toggle("active", bTag === tag);
  });

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

    // Trier les images par nom (dernière partie du public_id)
data.resources.sort((a, b) => {
  const nameA = a.public_id.split("/").pop().toLowerCase();
  const nameB = b.public_id.split("/").pop().toLowerCase();
  return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
});

    currentImages = data.resources.map(r => buildUrls(r));
    galleryEl.innerHTML = "";

    // clean previous observer
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    // create DOM items
    currentImages.forEach((imgObj, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-item";

      const imgEl = document.createElement("img");
      imgEl.dataset.src = imgObj.thumb;
      imgEl.alt = imgObj.caption || `Image ${idx + 1}`;
      imgEl.dataset.index = idx;
      imgEl.loading = "lazy";

      // **ajouter le click handler immédiatement**
      imgEl.addEventListener("click", () => openLightbox(idx));

      wrapper.appendChild(imgEl);
      galleryEl.appendChild(wrapper);
    });

    // IntersectionObserver for lazy loading (preload margin)
    observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.addEventListener("click", () => openLightbox(parseInt(img.dataset.index, 10)));
            img.addEventListener("load", () => img.classList.add("loaded"));
          }
          obs.unobserve(img);
        }
      });
    }, { rootMargin: "200px 0px" });

    document.querySelectorAll(".gallery img").forEach(i => observer.observe(i));
  } catch (err) {
    console.error("Erreur Cloudinary:", err);
    galleryEl.innerHTML = "<p style='color:red;text-align:center'>Impossible de charger la galerie.</p>";
    currentImages = [];
  }
}

/* expose a global function so inline onclick works */
window.loadGallery = loadCategory;

/* ---------- Lightbox ---------- */
function openLightbox(index) {
  if (!currentImages.length) return;
  currentIndex = index;
  updateLightbox();
  lightbox.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function updateLightbox() {
  const imgObj = currentImages[currentIndex];
  lightboxImg.src = imgObj.full;
  lightboxCaption.textContent = "";
}

function closeLightbox() {
  lightbox.style.display = "none";
  lightboxImg.src = "";
  document.body.style.overflow = "";
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

/* close when clicking outside content */
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

/* prev/next/close handlers (if present) */
if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });
if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });

/* keyboard navigation */
document.addEventListener("keydown", (e) => {
  if (lightbox.style.display === "flex") {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  }
});

/* ---------- Init: wire up buttons and load default ---------- */
buttonNodes.forEach(btn => {
  // determine tag robustly and store it
  const tag = extractTagFromButton(btn);
  if (tag) btn.setAttribute("data-tag", tag);

  // attach click using the resolved tag
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const t = btn.getAttribute("data-tag") || extractTagFromButton(btn) || "miniatures";
    loadCategory(t);
  });
});

// default: first button's tag or 'miniatures'
const firstTag = (buttonNodes[0] && (buttonNodes[0].getAttribute("data-tag") || extractTagFromButton(buttonNodes[0]))) || "miniatures";
loadCategory(firstTag);
