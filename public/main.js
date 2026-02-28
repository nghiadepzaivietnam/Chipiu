// Handle create moment form (still useful on homepage)
const form = document.getElementById('moment-form');
const formStatus = document.getElementById('form-status');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formStatus.textContent = 'Dang luu...';
    const fd = new FormData(form);
    fd.set('allowCombined', form.allowCombined.checked);

    try {
      const res = await fetch('/api/moments', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Luu that bai');
      }

      form.reset();
      formStatus.textContent = 'Da luu!';
    } catch (err) {
      formStatus.textContent = 'Co loi: ' + err.message;
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
      statusBox.textContent = 'Chua co trang thai nao.';
      return;
    }
    statusBox.innerHTML = `
      <strong>${data.city}</strong><br/>
      ${data.temperatureC ? `${data.temperatureC}°C · ` : ''}${data.condition || '—'}<br/>
      <span class="status">${data.note || ''}</span><br/>
      <span class="status">Cap nhat luc ${new Date(data.updatedAt || data.createdAt).toLocaleString('vi-VN')}</span>
    `;
  } catch (err) {
    statusBox.textContent = 'Khong tai duoc trang thai.';
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
      statusBox.textContent = 'Khong cap nhat duoc.';
    }
  });
}

if (refreshStatusBtn) refreshStatusBtn.addEventListener('click', fetchStatus);

fetchStatus();
