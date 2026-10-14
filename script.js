"use strict";

const DB_NAME = "DaennaPortfolioDatabase";
const DB_VERSION = 1;
const STORE_NAME = "images";

let db;
let orgCurrentSlide = 0;
const orgSlideCount = 6;
const objectURLs = new Map();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = event => {
      db = event.target.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

function getMedia(key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function createObjectURL(key, file) {
  if (objectURLs.has(key)) {
    URL.revokeObjectURL(objectURLs.get(key));
  }

  const url = URL.createObjectURL(file);
  objectURLs.set(key, url);
  return url;
}

function setImage(key, file, image, placeholder) {
  if (!file) {
    image.removeAttribute("src");
    image.style.display = "none";
    placeholder.style.display = "grid";
    return;
  }

  image.src = createObjectURL(key, file);
  image.style.display = "block";
  placeholder.style.display = "none";
}

/* Profile picture */
async function setupProfile() {
  const image = document.getElementById("profileImage");
  const placeholder = document.getElementById("profilePlaceholder");

  setImage("profile", await getMedia("profile"), image, placeholder);
}

/* Film-strip dance photo galleries */
function createFilmHoles() {
  return `<div class="film-holes" aria-hidden="true">
    ${Array.from({ length: 8 }, () => "<span></span>").join("")}
  </div>`;
}

function createFilmCard(type, number, caption) {
  const key = `${type}${number}`;
  const card = document.createElement("article");

  card.className = "film-frame";
  card.style.setProperty("--tilt", `${(number % 3 - 1) * 1.2}deg`);

  card.innerHTML = `
    ${createFilmHoles()}
    <img class="film-photo" alt="${caption} photo ${number}" loading="lazy">
    <div class="film-placeholder">${caption}<br>Photo slot ${number}</div>
    <p class="film-caption">${caption} · ${number}</p>
    ${createFilmHoles().replace(
      'class="film-holes"',
      'class="film-holes film-bottom"'
    )}
  `;

  return { card, key };
}

async function setupFilmGallery(containerId, type, count, caption) {
  const container = document.getElementById(containerId);

  for (let number = 1; number <= count; number++) {
    const { card, key } = createFilmCard(type, number, caption);
    container.appendChild(card);

    const image = card.querySelector(".film-photo");
    const placeholder = card.querySelector(".film-placeholder");

    setImage(key, await getMedia(key), image, placeholder);
  }
}

/* Certificate gallery */
function createCertificateCard(number) {
  const titles = {
    1: "Planning for Progress: Time Management for College Success",
    2: "Building the Future: Real-World Tools for IT and CS Students",
    3: "The Culture Industry: Enlightenment as Mass Deception",
    4: "Responsible Use of AI in Education"
  };

  const key = `certificate${number}`;
  const card = document.createElement("article");

  card.className = "panel certificate-card";
  card.innerHTML = `
    <img class="certificate-image" alt="${titles[number]}" loading="lazy">
    <div class="certificate-placeholder">
      Certificate ${number}
    </div>
    <h3>${titles[number]}</h3>
  `;

  return { card, key };
}

async function setupCertificates() {
  const container = document.getElementById("certificateGallery");

  for (let number = 1; number <= 4; number++) {
    const { card, key } = createCertificateCard(number);
    container.appendChild(card);

    const image = card.querySelector(".certificate-image");
    const placeholder = card.querySelector(".certificate-placeholder");

    setImage(key, await getMedia(key), image, placeholder);
  }
}

/* Organization flip-card image */
async function setupOrgFlipCard() {
  const card = document.getElementById("orgFlipCard");
  const image = document.getElementById("orgFlipImage");
  const placeholder = document.getElementById("orgFlipPlaceholder");

  function flipCard() {
    card.classList.toggle("is-flipped");
    card.setAttribute(
      "aria-label",
      card.classList.contains("is-flipped")
        ? "Flip organization event photo to front"
        : "Flip organization event photo"
    );
  }

  card.addEventListener("click", flipCard);

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      flipCard();
    }
  });

  setImage("orgFlip", await getMedia("orgFlip"), image, placeholder);
}

/* Six-photo organization event slideshow */
async function setupOrgEventSlider() {
  const mainImage = document.getElementById("orgSlideImage");
  const placeholder = document.getElementById("orgSlidePlaceholder");
  const numberText = document.getElementById("orgSlideNumber");
  const counter = document.getElementById("orgSlideCounter");
  const prevButton = document.getElementById("orgPrevSlide");
  const nextButton = document.getElementById("orgNextSlide");
  const dotsContainer = document.getElementById("orgSlideDots");
  const thumbnailsContainer = document.getElementById("orgSlideThumbnails");

  const slides = [];
  const dots = [];
  const thumbnails = [];

  for (let index = 0; index < orgSlideCount; index++) {
    const key = `orgEvent${index + 1}`;
    const file = await getMedia(key);

    slides.push({ key, file });

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "org-slide-dot";
    dot.setAttribute("aria-label", `Show event photo ${index + 1}`);
    dot.addEventListener("click", () => showSlide(index));
    dotsContainer.appendChild(dot);
    dots.push(dot);

    const thumbnail = document.createElement("button");
    thumbnail.type = "button";
    thumbnail.className = "org-thumbnail";
    thumbnail.setAttribute("aria-label", `Select event photo ${index + 1}`);
    thumbnail.innerHTML = `
      <div class="org-thumbnail-empty">✦</div>
      <span>Photo ${index + 1}</span>
    `;

    thumbnail.addEventListener("click", () => showSlide(index));
    thumbnailsContainer.appendChild(thumbnail);
    thumbnails.push(thumbnail);

    if (file) {
      updateThumbnail(index, file);
    }
  }

  function updateThumbnail(index, file) {
    const thumbnail = thumbnails[index];
    const url = createObjectURL(`orgThumbnail${index + 1}`, file);

    thumbnail.innerHTML = `
      <img src="${url}" alt="Event photo ${index + 1} thumbnail">
      <span>Photo ${index + 1}</span>
    `;
  }

  function showSlide(index) {
    orgCurrentSlide = (index + orgSlideCount) % orgSlideCount;

    const slide = slides[orgCurrentSlide];
    const labelNumber = String(orgCurrentSlide + 1).padStart(2, "0");

    counter.textContent = `${labelNumber} / 06`;
    numberText.textContent = `${labelNumber} / 06`;

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === orgCurrentSlide);
      dot.setAttribute("aria-pressed", String(i === orgCurrentSlide));
    });

    thumbnails.forEach((thumbnail, i) => {
      thumbnail.classList.toggle("active", i === orgCurrentSlide);
      thumbnail.setAttribute("aria-pressed", String(i === orgCurrentSlide));
    });

    setImage(slide.key, slide.file, mainImage, placeholder);
  }

  prevButton.addEventListener("click", () => {
    showSlide(orgCurrentSlide - 1);
  });

  nextButton.addEventListener("click", () => {
    showSlide(orgCurrentSlide + 1);
  });

  showSlide(0);
}

/* Singing audio player */
async function setupVoiceUpload() {
  const area = document.getElementById("voicePlayerArea");

  async function displayAudio(file) {
    area.replaceChildren();

    if (!file) {
      const message = document.createElement("p");
      message.className = "muted";
      message.textContent = "No recording added yet.";
      area.appendChild(message);
      return;
    }

    const url = createObjectURL("voice", file);

    const name = document.createElement("p");
    name.className = "voice-name";
    name.textContent = file.name || "My singing recording";

    const player = document.createElement("audio");
    player.controls = true;
    player.preload = "metadata";
    player.src = url;

    area.append(name, player);
  }

  await displayAudio(await getMedia("voice"));
}

/* Theme toggle */
function setupTheme() {
  const button = document.getElementById("themeToggle");

  try {
    if (localStorage.getItem("portfolioTheme") === "light") {
      document.body.classList.add("light-mode");
    }
  } catch (error) {
    console.warn("Theme preference storage is unavailable.", error);
  }

  function updateButton() {
    const light = document.body.classList.contains("light-mode");

    button.textContent = light ? "🌙" : "☀️";
    button.setAttribute(
      "aria-label",
      light ? "Switch to dark mode" : "Switch to light mode"
    );

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", light ? "#f8f2fc" : "#100817");
  }

  updateButton();

  button.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");

    try {
      localStorage.setItem(
        "portfolioTheme",
        document.body.classList.contains("light-mode") ? "light" : "dark"
      );
    } catch (error) {
      console.warn("Could not save theme preference.", error);
    }

    updateButton();
  });
}

/* Mouse-following glow */
function setupMouseEffects() {
  const glow = document.getElementById("mouseGlow");

  if (!glow || matchMedia("(hover: none), (pointer: coarse)").matches) {
    return;
  }

  document.addEventListener("pointermove", event => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
    glow.style.opacity = "1";
  });

  document.addEventListener("pointerleave", () => {
    glow.style.opacity = "0";
  });

  document.addEventListener("pointerover", event => {
    const target = event.target;
    const interactive = target instanceof Element &&
      target.closest(
        ".panel, .timeline-card, .film-frame, .certificate-card, .button, .social-links a, .org-flip-card, .org-thumbnail"
      );

    glow.style.background = interactive
      ? "radial-gradient(circle, rgba(102,200,255,.32), rgba(141,61,255,.13) 45%, transparent 72%)"
      : "radial-gradient(circle, rgba(102,200,255,.22), rgba(141,61,255,.10) 42%, transparent 72%)";
  });
}

/* Start the portfolio */
async function initializePortfolio() {
  setupTheme();
  setupMouseEffects();

  try {
    await openDatabase();

    await setupProfile();

    await setupFilmGallery(
      "cheerdanceGallery", "cheerdance", 6, "SHS CHEERDANCE"
    );

    await setupFilmGallery(
      "hiphopGallery", "hiphop", 6, "COLLEGE HIP-HOP"
    );

    await setupCertificates();
    await setupOrgFlipCard();
    await setupOrgEventSlider();
    await setupVoiceUpload();
  } catch (error) {
    console.error("Portfolio media storage error:", error);
  }
}

initializePortfolio();

/* Extra small moving butterflies — additive; existing effects remain intact. */
(function addExtraButterflies() {
  const addButterflies = () => {
    if (document.querySelector('.butterfly-extra')) return;

    const positions = [
      ['7%', '18%'], ['17%', '42%'], ['91%', '19%'], ['84%', '38%'],
      ['5%', '66%'], ['94%', '61%'], ['24%', '84%'], ['72%', '88%'],
      ['44%', '12%'], ['61%', '31%'], ['37%', '58%'], ['78%', '53%']
    ];

    positions.forEach(([left, top], index) => {
      const butterfly = document.createElement('span');
      butterfly.className = 'butterfly-extra';
      butterfly.textContent = '🦋';
      butterfly.setAttribute('aria-hidden', 'true');
      butterfly.style.left = left;
      butterfly.style.top = top;
      butterfly.style.animationDelay = `${-(index * 0.8)}s`;
      document.body.appendChild(butterfly);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addButterflies, { once: true });
  } else {
    addButterflies();
  }
})();

/* ===== Floating chatbot widget ===== */
(() => {
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeButton = document.getElementById('chatClose');
  if (!toggle || !panel) return;

  const setOpen = open => {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    toggle.textContent = open ? '✕' : '💬';
  };

  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  if (closeButton) closeButton.addEventListener('click', () => { setOpen(false); toggle.focus(); });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && panel.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
})();