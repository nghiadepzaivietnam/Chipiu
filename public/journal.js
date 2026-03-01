const feedEl = document.getElementById('journal-feed');
const ownerSelectBtn = document.getElementById('ownerSelectBtn');
const ownerSelectLabel = document.getElementById('ownerSelectLabel');
const ownerMenu = document.getElementById('ownerMenu');
const ownerOptions = document.querySelectorAll('.audience-option');
const reloadBtn = document.getElementById('reload');
const statusClock = document.getElementById('statusClock');
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxMediaWrap = document.getElementById('lightboxMediaWrap');
const lightboxOwner = document.getElementById('lightboxOwner');
const lightboxCaption = document.getElementById('lightboxCaption');

let cache = [];
let current = 'all';
let zoomed = false;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tickClock() {
  if (!statusClock) return;
  const now = new Date();
  statusClock.textContent = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function setZoomState(nextZoomed) {
  zoomed = Boolean(nextZoomed);
  const image = lightboxMediaWrap?.querySelector('img');
  if (!image) return;
  image.classList.toggle('zoomed', zoomed);
}

function openLightbox(item) {
  if (!lightbox || !lightboxMediaWrap) return;

  lightboxMediaWrap.innerHTML = '';
  setZoomState(false);

  if (item.mediaType === 'image' && item.mediaUrl) {
    const image = document.createElement('img');
    image.src = item.mediaUrl;
    image.alt = 'moment';
    image.loading = 'eager';
    image.addEventListener('click', () => setZoomState(!zoomed));
    lightboxMediaWrap.appendChild(image);
  } else if (item.mediaType === 'video' && item.mediaUrl) {
    const video = document.createElement('video');
    video.src = item.mediaUrl;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    lightboxMediaWrap.appendChild(video);
  } else {
    const text = document.createElement('p');
    text.className = 'lightbox-only-text';
    text.textContent = item.caption || 'Khong co media';
    lightboxMediaWrap.appendChild(text);
  }

  if (lightboxOwner) lightboxOwner.textContent = item.owner || 'User';
  if (lightboxCaption) lightboxCaption.textContent = item.caption || '...';

  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closeLightbox() {
  if (!lightbox || !lightboxMediaWrap) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxMediaWrap.innerHTML = '';
  setZoomState(false);
  document.body.classList.remove('no-scroll');
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'camera-tile';

  if (item.mediaType === 'image' && item.mediaUrl) {
    card.innerHTML = `<img src="${item.mediaUrl}" alt="moment" loading="lazy" />`;
  } else if (item.mediaType === 'video' && item.mediaUrl) {
    card.innerHTML = `<video src="${item.mediaUrl}" muted playsinline webkit-playsinline autoplay loop preload="metadata"></video>`;
  } else {
    const safeText = item.caption ? item.caption : 'Khoanh khac';
    card.classList.add('text-tile');
    card.innerHTML = `<p>${safeText}</p>`;
  }

  const tag = document.createElement('span');
  tag.className = 'owner-dot';
  tag.textContent = item.owner || 'User';
  card.appendChild(tag);
  card.addEventListener('click', () => openLightbox(item));

  return card;
}

function ownerMatches(owner, selected) {
  const normalizedOwner = normalizeText(owner);
  if (selected === 'hai anh') {
    return normalizedOwner.includes('hai') && normalizedOwner.includes('anh');
  }
  if (selected === 'trong nghia') {
    return normalizedOwner.includes('trong') && normalizedOwner.includes('nghia');
  }
  return normalizedOwner === selected;
}

function render() {
  if (!cache.length) {
    feedEl.innerHTML = '<p class="status camera-empty">Chua co bai dang nao.</p>';
    return;
  }

  const normalizedCurrent = normalizeText(current);
  const items = cache.filter((m) => {
    if (normalizedCurrent === 'all') return true;
    return ownerMatches(m.owner, normalizedCurrent);
  });

  if (!items.length) {
    feedEl.innerHTML = '<p class="status camera-empty">Khong co bai dang cho bo loc nay.</p>';
    return;
  }

  feedEl.innerHTML = '';
  items.forEach((item) => {
    feedEl.appendChild(createCard(item));
  });
}

async function fetchMoments() {
  try {
    const res = await fetch('/api/moments?combined=true');
    if (!res.ok) throw new Error('Request failed');
    cache = await res.json();
    render();
  } catch (_err) {
    feedEl.innerHTML = '<p class="status camera-empty">Khong tai duoc du lieu.</p>';
  }
}

function closeOwnerMenu() {
  if (!ownerMenu || !ownerSelectBtn) return;
  ownerMenu.classList.remove('open');
  ownerSelectBtn.setAttribute('aria-expanded', 'false');
}

ownerSelectBtn?.addEventListener('click', () => {
  if (!ownerMenu || !ownerSelectBtn) return;
  const isOpen = ownerMenu.classList.toggle('open');
  ownerSelectBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

ownerOptions.forEach((option) => {
  option.addEventListener('click', () => {
    current = option.dataset.filter || 'all';
    if (ownerSelectLabel) ownerSelectLabel.textContent = option.dataset.label || 'Mọi người';
    ownerOptions.forEach((opt) => opt.classList.remove('active'));
    option.classList.add('active');
    closeOwnerMenu();
    render();
  });
});

reloadBtn?.addEventListener('click', fetchMoments);
lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeOwnerMenu();
    closeLightbox();
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.audience-dropdown')) {
    closeOwnerMenu();
  }
});

tickClock();
setInterval(tickClock, 30000);
fetchMoments();
