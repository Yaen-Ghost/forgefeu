// gallery2.js — Masonry + imagesLoaded + cascade au scroll
const cloudName = "dx0mbjcva";

const galleryEl = document.getElementById("gallery");
const buttonNodes = document.querySelectorAll(".gallery-menu button");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
const closeBtn = document.querySelector("#lightbox .close");
const prevBtn = document.querySelector("#lightbox .prev");
const nextBtn = document.querySelector("#lightbox .next");

let currentImages = [];
let currentIndex = 0;
let observer = null;
let msnry = null;
const STAGGER = 90; // ms entre chaque élément lors de la cascade

/* ---------- Helpers ---------- */
function extractTagFromButton(btn) {
  let tag = btn.getAttribute("data-tag");
  if (tag) return tag.trim();
  const onclick = btn.getAttribute("onclick");
  if (onclick) {
    const m = onclick.match(/loadGallery\(['"]([^'"]+)['"]\)/);
    if (m && m[1]) return m[1];
  }
  if (btn.dataset && btn.dataset.tag) return btn.dataset.tag.trim();
  return btn.textContent.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function buildUrls(resource) {
  const fullBase = resource.secure_url
    ? resource.secure_url
    : `https://res.cloudinary.com/${cloudName}/image/upload/${resource.public_id}.${resource.format}`;

  const thumb = fullBase.includes("/upload/")
    ? fullBase.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_400/")
    : fullBase;

  const full = fullBase.includes("/upload/")
    ? fullBase.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_1600/")
    : fullBase;

  // ✅ Cloudinary "Description (alt)" = resource.context?.alt
  const description =
    resource.context?.alt ||
    resource.context?.custom?.description ||
    resource.public_id.split("/").pop() ||
    "";

  return { thumb, full, caption: resource.public_id.split("/").pop(), description };
}



/* ---------- Masonry init ---------- */
function initMasonry() {
  if (typeof Masonry === "undefined") {
    console.warn("Masonry non trouvé — vérifie que tu as inclus masonry.pkgd.min.js avant gallery2.js");
    return;
  }
  if (msnry) msnry.destroy();
  msnry = new Masonry(galleryEl, {
    itemSelector: ".gallery-item",
    columnWidth: ".gallery-item",
    percentPosition: true,
    gutter: 15,
    transitionDuration: 0
  });
}

/* ---------- Main loader ---------- */
async function loadCategory(tag = "miniatures") {
  // bouton actif
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

    // tri naturel
    data.resources.sort((a, b) => {
      const nameA = a.public_id.split("/").pop().toLowerCase();
      const nameB = b.public_id.split("/").pop().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });

    currentImages = data.resources.map(r => buildUrls(r));
    galleryEl.innerHTML = "";

    // cleanup observer
    if (observer) { observer.disconnect(); observer = null; }

    // ajouter items DOM
    currentImages.forEach((imgObj, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "gallery-item";
      wrapper.dataset.index = idx; // utilité éventuelle

      const imgEl = document.createElement("img");
      imgEl.dataset.src = imgObj.thumb;
      imgEl.alt = imgObj.caption || `Image ${idx + 1}`;
      imgEl.dataset.index = idx;
      imgEl.loading = "lazy";

      // clic pour lightbox
      imgEl.addEventListener("click", () => openLightbox(idx));

      // quand l'image charge, on marque loaded et on demande un layout Masonry
      imgEl.addEventListener("load", () => {
        imgEl.classList.add("loaded");
        if (msnry) msnry.layout();
      });

      wrapper.appendChild(imgEl);
      galleryEl.appendChild(wrapper);
    });

    // initialiser Masonry (avant lazy load) pour que la grille existe
    initMasonry();

    // imagesLoaded : quand les images déjà en cache sont ok, relayout
    if (typeof imagesLoaded !== "undefined") {
      imagesLoaded(galleryEl, () => {
        if (msnry) msnry.layout();
      });
    }

    // IntersectionObserver sur les WRAPPERS (pas sur les images) — cela nous donne le groupe d'items visibles
    observer = new IntersectionObserver((entries, obs) => {
      // garder uniquement les wrappers qui sont visibles et pas encore montrés
      const visibleWrappers = entries
        .filter(en => en.isIntersecting)
        .map(en => en.target)
        .filter(w => !w.classList.contains("show"));

      if (!visibleWrappers.length) return;

      // trier par position visuelle : top then left (relative au viewport)
      visibleWrappers.sort((a, b) => {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        // priorité top (tolérance 10px), sinon left
        if (Math.abs(ra.top - rb.top) > 10) return ra.top - rb.top;
        return ra.left - rb.left;
      });

      // pour chaque wrapper visible, lazy-load l'image et planifier le reveal en cascade
      visibleWrappers.forEach((wrapper, i) => {
        const img = wrapper.querySelector("img");
        if (img && img.dataset.src && !img.src) {
          img.src = img.dataset.src;
        }
        setTimeout(() => {
          wrapper.classList.add("show");
          // on ne relayoute pas après chaque item pour perf ; on fera un layout final
        }, i * STAGGER);

        // on arrête d'observer le wrapper (animation jouera une seule fois)
        obs.unobserve(wrapper);
      });

      // relayout Masonry une fois la cascade programmée (après le dernier delay)
      const totalDelay = visibleWrappers.length * STAGGER + 70;
      setTimeout(() => {
        if (msnry) msnry.layout();
      }, totalDelay);
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

    // observer sur tous les wrappers
    document.querySelectorAll(".gallery-item").forEach(w => {
      // reset état d'affichage (utile si on change de catégorie)
      w.classList.remove("show");
      observer.observe(w);
    });

  } catch (err) {
    console.error("Erreur Cloudinary:", err);
    galleryEl.innerHTML = "<p style='color:red;text-align:center'>Impossible de charger la galerie.</p>";
    currentImages = [];
  }
}

/* expose global function */
window.loadGallery = loadCategory;

/* ---------- Lightbox (inchangé) ---------- */
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
  lightboxCaption.textContent = imgObj.description || "";
}
function closeLightbox() {
  lightbox.style.display = "none";
  lightboxImg.src = "";
  document.body.style.overflow = "";
}
function showPrev() { if (!currentImages.length) return; currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length; updateLightbox(); }
function showNext() { if (!currentImages.length) return; currentIndex = (currentIndex + 1) % currentImages.length; updateLightbox(); }

lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); showPrev(); });
if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); showNext(); });
if (closeBtn) closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (lightbox.style.display === "flex") {
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") showPrev();
    if (e.key === "ArrowRight") showNext();
  }
});

/* ---------- Init ---------- */
buttonNodes.forEach(btn => {
  const tag = extractTagFromButton(btn);
  if (tag) btn.setAttribute("data-tag", tag);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const t = btn.getAttribute("data-tag") || extractTagFromButton(btn) || "miniatures";
    loadCategory(t);
  });
});
const firstTag = (buttonNodes[0] && (buttonNodes[0].getAttribute("data-tag") || extractTagFromButton(buttonNodes[0]))) || "miniatures";
loadCategory(firstTag);
