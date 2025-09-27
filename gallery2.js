// gallery2.js — Masonry + imagesLoaded + cascade au scroll via GSAP
const cloudName = "dx0mbjcva";

const galleryEl = document.getElementById("gallery");
const buttonNodes = document.querySelectorAll(".gallery-menu button");
let currentImages = [];
let currentIndex = 0;
let msnry = null;
const STAGGER = 0.1; // délai entre animations en secondes

/* Helpers */
function extractTagFromButton(btn) { /* inchangé */ }
function buildUrls(resource) { /* inchangé */ }

/* Masonry init */
function initMasonry() {
  if (msnry) msnry.destroy();
  msnry = new Masonry(galleryEl, {
    itemSelector: ".gallery-item",
    columnWidth: ".gallery-item",
    percentPosition: true,
    gutter: 15,
    transitionDuration: 0
  });
}

/* Load category */
async function loadCategory(tag = "miniatures") {
  buttonNodes.forEach(b => {
    const bTag = b.getAttribute("data-tag") || extractTagFromButton(b);
    b.classList.toggle("active", bTag === tag);
  });

  galleryEl.innerHTML = `<p style="text-align:center">Chargement...</p>`;

  try {
    const res = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`);
    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
    const data = await res.json();
    if (!data.resources?.length) {
      galleryEl.innerHTML = "<p style='text-align:center'>Aucune image trouvée.</p>";
      currentImages = [];
      return;
    }

    data.resources.sort((a, b) => {
      const nameA = a.public_id.split("/").pop().toLowerCase();
      const nameB = b.public_id.split("/").pop().toLowerCase();
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
    });

    currentImages = data.resources.map(r => buildUrls(r));
    galleryEl.innerHTML = "";

currentImages.forEach((imgObj, idx) => {
  const wrapper = document.createElement("div");
  wrapper.className = "gallery-item";

  const imgEl = document.createElement("img");
  imgEl.src = imgObj.thumb;  // <-- ici on met directement src
  imgEl.alt = imgObj.caption || `Image ${idx+1}`;
  imgEl.loading = "lazy";

  // clic pour lightbox
  imgEl.addEventListener("click", () => openLightbox(idx));

  // quand l'image charge, on relayout Masonry
  imgEl.addEventListener("load", () => {
    imgEl.classList.add("loaded");
    if (msnry) msnry.layout();
  });

  wrapper.appendChild(imgEl);
  galleryEl.appendChild(wrapper);
});


    initMasonry();

    // imagesLoaded + Masonry relayout
    if (typeof imagesLoaded !== "undefined") {
      imagesLoaded(galleryEl, () => msnry.layout());
    }

    // GSAP animations au scroll
    if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray(".gallery-item").forEach((item, i) => {
        gsap.fromTo(item,
          { opacity: 0, y: 50 },
          { 
            opacity: 1,
            y: 0,
            duration: 0.8,
            delay: i * STAGGER,
            scrollTrigger: {
              trigger: item,
              start: "top 85%",
              toggleActions: "play none none reverse"
            }
          });
      });
    }

  } catch(err) {
    console.error(err);
    galleryEl.innerHTML = "<p style='color:red;text-align:center'>Impossible de charger la galerie.</p>";
    currentImages = [];
  }
}

window.loadGallery = loadCategory;

/* Lightbox (inchangé) */
function openLightbox(index) { /* inchangé */ }
function updateLightbox() { /* inchangé */ }
function closeLightbox() { /* inchangé */ }
function showPrev() { /* inchangé */ }
function showNext() { /* inchangé */ }

lightbox.addEventListener("click", e => { if(e.target===lightbox) closeLightbox(); });
if(prevBtn) prevBtn.addEventListener("click", e=>{e.stopPropagation(); showPrev();});
if(nextBtn) nextBtn.addEventListener("click", e=>{e.stopPropagation(); showNext();});
if(closeBtn) closeBtn.addEventListener("click", e=>{e.stopPropagation(); closeLightbox();});
document.addEventListener("keydown", e=>{
  if(lightbox.style.display==="flex"){
    if(e.key==="Escape") closeLightbox();
    if(e.key==="ArrowLeft") showPrev();
    if(e.key==="ArrowRight") showNext();
  }
});

/* Init boutons */
buttonNodes.forEach(btn=>{
  const tag = extractTagFromButton(btn);
  if(tag) btn.setAttribute("data-tag", tag);
  btn.addEventListener("click", e=>{
    e.preventDefault();
    const t = btn.getAttribute("data-tag") || extractTagFromButton(btn) || "miniatures";
    loadCategory(t);
  });
});

const firstTag = (buttonNodes[0]?.getAttribute("data-tag") || extractTagFromButton(buttonNodes[0])) || "miniatures";
loadCategory(firstTag);
