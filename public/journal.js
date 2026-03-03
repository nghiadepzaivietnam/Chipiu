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
const lightboxDownload = document.getElementById('lightboxDownload');
const lightboxDelete = document.getElementById('lightboxDelete');
const lightboxActionStatus = document.getElementById('lightboxActionStatus');

let cache = [];
let current = 'all';
let zoomed = false;
let activeMoment = null;

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
  activeMoment = item;

  lightboxMediaWrap.innerHTML = '';
  setZoomState(false);
  if (lightboxActionStatus) lightboxActionStatus.textContent = '';

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
    text.textContent = item.caption || 'Kh\u00f4ng c\u00f3 media';
    lightboxMediaWrap.appendChild(text);
  }

  if (lightboxOwner) lightboxOwner.textContent = item.owner || 'User';
  if (lightboxCaption) lightboxCaption.textContent = item.caption || '...';
  if (lightboxDownload) lightboxDownload.disabled = !(item.mediaUrl && item.mediaType !== 'none');
  if (lightboxDelete) lightboxDelete.disabled = !item._id;

  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function closeLightbox() {
  if (!lightbox || !lightboxMediaWrap) return;
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxMediaWrap.innerHTML = '';
  if (lightboxActionStatus) lightboxActionStatus.textContent = '';
  setZoomState(false);
  activeMoment = null;
  document.body.classList.remove('no-scroll');
}

function inferExtension(mediaType, fallbackUrl) {
  if (mediaType === 'image') return 'jpg';
  if (mediaType === 'video') return 'mp4';
  if (!fallbackUrl) return 'dat';
  const cleanUrl = fallbackUrl.split('?')[0];
  const dot = cleanUrl.lastIndexOf('.');
  return dot === -1 ? 'dat' : cleanUrl.slice(dot + 1).toLowerCase();
}

async function downloadCurrentMoment() {
  if (!activeMoment?.mediaUrl) return;

  const extension = inferExtension(activeMoment.mediaType, activeMoment.mediaUrl);
  const filename = `moment-${activeMoment._id || Date.now()}.${extension}`;

  try {
    const res = await fetch(activeMoment.mediaUrl);
    if (!res.ok) throw new Error('T\u1ea3i file th\u1ea5t b\u1ea1i');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    if (lightboxActionStatus) lightboxActionStatus.textContent = '\u0110\u00e3 t\u1ea3i xu\u1ed1ng.';
  } catch (_err) {
    window.open(activeMoment.mediaUrl, '_blank', 'noopener,noreferrer');
    if (lightboxActionStatus) {
      lightboxActionStatus.textContent = 'Kh\u00f4ng t\u1ea3i tr\u1ef1c ti\u1ebfp \u0111\u01b0\u1ee3c, \u0111\u00e3 m\u1edf file \u1edf tab m\u1edbi.';
    }
  }
}

async function deleteCurrentMoment() {
  if (!activeMoment?._id) return;
  const ok = window.confirm('B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a kho\u1ea3nh kh\u1eafc n\u00e0y?');
  if (!ok) return;

  try {
    if (lightboxDelete) lightboxDelete.disabled = true;
    const res = await fetch(`/api/moments/${activeMoment._id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'X\u00f3a th\u1ea5t b\u1ea1i');

    cache = cache.filter((m) => m._id !== activeMoment._id);
    render();
    closeLightbox();
  } catch (err) {
    if (lightboxActionStatus) lightboxActionStatus.textContent = `Kh\u00f4ng x\u00f3a \u0111\u01b0\u1ee3c: ${err.message}`;
  } finally {
    if (lightboxDelete) lightboxDelete.disabled = !activeMoment?._id;
  }
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'camera-tile';

  if (item.mediaType === 'image' && item.mediaUrl) {
    card.innerHTML = `<img src="${item.mediaUrl}" alt="moment" loading="lazy" />`;
  } else if (item.mediaType === 'video' && item.mediaUrl) {
    card.innerHTML = `<video src="${item.mediaUrl}" muted playsinline webkit-playsinline autoplay loop preload="metadata"></video>`;
  } else {
    const safeText = item.caption ? item.caption : 'Kho\u1ea3nh kh\u1eafc';
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
    feedEl.innerHTML = '<p class="status camera-empty">Ch\u01b0a c\u00f3 b\u00e0i \u0111\u0103ng n\u00e0o.</p>';
    return;
  }

  const normalizedCurrent = normalizeText(current);
  const items = cache.filter((m) => {
    if (normalizedCurrent === 'all') return true;
    return ownerMatches(m.owner, normalizedCurrent);
  });

  if (!items.length) {
    feedEl.innerHTML = '<p class="status camera-empty">Kh\u00f4ng c\u00f3 b\u00e0i \u0111\u0103ng cho b\u1ed9 l\u1ecdc n\u00e0y.</p>';
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
    feedEl.innerHTML = '<p class="status camera-empty">Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u.</p>';
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
    if (ownerSelectLabel) ownerSelectLabel.textContent = option.dataset.label || 'M\u1ecdi ng\u01b0\u1eddi';
    ownerOptions.forEach((opt) => opt.classList.remove('active'));
    option.classList.add('active');
    closeOwnerMenu();
    render();
  });
});

reloadBtn?.addEventListener('click', fetchMoments);
lightboxClose?.addEventListener('click', closeLightbox);
lightboxDownload?.addEventListener('click', downloadCurrentMoment);
lightboxDelete?.addEventListener('click', deleteCurrentMoment);
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


