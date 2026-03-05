(function initFlightSuwonNoiBaiPage() {
  const targetDate = new Date("2025-07-30T00:00:00+07:00");

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const statusEl = document.getElementById("countdownStatus");
  const seoulTimeEl = document.getElementById("seoulTime");
  const vnTimeEl = document.getElementById("vnTime");

  function toClock(timeZone) {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date());
  }

  function splitDuration(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return { days, hours, minutes, seconds };
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function render() {
    const now = new Date();
    const deltaSec = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
    const isFuture = deltaSec >= 0;
    const parts = splitDuration(Math.abs(deltaSec));

    daysEl.textContent = String(parts.days);
    hoursEl.textContent = pad2(parts.hours);
    minutesEl.textContent = pad2(parts.minutes);
    secondsEl.textContent = pad2(parts.seconds);

    if (isFuture) {
      statusEl.textContent = `Còn ${parts.days} ngày ${parts.hours} giờ ${parts.minutes} phút ${parts.seconds} giây tới 30/07/2025.`;
    } else {
      statusEl.textContent = `Đã qua ${parts.days} ngày ${parts.hours} giờ ${parts.minutes} phút ${parts.seconds} giây kể từ 30/07/2025.`;
    }

    seoulTimeEl.textContent = toClock("Asia/Seoul");
    vnTimeEl.textContent = toClock("Asia/Ho_Chi_Minh");
  }

  render();
  setInterval(render, 1000);
})();
