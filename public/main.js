// Handle create moment form (still useful on homepage)
const form = document.getElementById('moment-form');
const formStatus = document.getElementById('form-status');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.textContent = '\u0110ang l\u01b0u...';
    const fd = new FormData(form);
    fd.set('allowCombined', form.allowCombined.checked);

    try {
      const res = await fetch('/api/moments', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'L\u01b0u th\u1ea5t b\u1ea1i');
      }

      form.reset();
      formStatus.textContent = '\u0110\u00e3 l\u01b0u!';
    } catch (err) {
      formStatus.textContent = 'C\u00f3 l\u1ed7i: ' + err.message;
    } finally {
      setTimeout(() => (formStatus.textContent = ''), 2200);
    }
  });
}

// Status handling
const statusBox = document.getElementById('status-view');
const statusForm = document.getElementById('status-form');
const refreshStatusBtn = document.getElementById('refresh-status');

async function fetchStatus() {
  if (!statusBox) return;
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data || !data.city) {
      statusBox.textContent = 'Ch\u01b0a c\u00f3 tr\u1ea1ng th\u00e1i n\u00e0o.';
      return;
    }
    statusBox.innerHTML = `
      <strong>${data.city}</strong><br/>
      ${data.temperatureC ? `${data.temperatureC}?C ? ` : ''}${data.condition || '?'}<br/>
      <span class="status">${data.note || ''}</span><br/>
      <span class="status">C\u1eadp nh\u1eadt l\u00fac ${new Date(data.updatedAt || data.createdAt).toLocaleString('vi-VN')}</span>
    `;
  } catch (err) {
    statusBox.textContent = 'Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c tr\u1ea1ng th\u00e1i.';
  }
}

if (statusForm) {
  statusForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(statusForm).entries());
    if (payload.temperatureC === '') delete payload.temperatureC;
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      statusForm.reset();
      fetchStatus();
    } catch (err) {
      statusBox.textContent = 'Kh\u00f4ng c\u1eadp nh\u1eadt \u0111\u01b0\u1ee3c.';
    }
  });
}

if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', fetchStatus);

fetchStatus();

