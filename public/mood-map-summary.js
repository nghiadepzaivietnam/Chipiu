(function initMoodSummaryCard() {
  const card = document.getElementById("moodQuickCard");
  if (!card) return;

  const mineEl = document.getElementById("moodQuickMine");
  const partnerEl = document.getElementById("moodQuickPartner");
  const metaEl = document.getElementById("moodQuickMeta");

  const moodLabel = {
    great: "Tuyệt vời",
    good: "Ổn và vui",
    okay: "Bình thường",
    tired: "Hơi mệt",
    sad: "Buồn",
    stressed: "Căng thẳng",
    angry: "Khó chịu",
  };

  function toLabel(value) {
    return moodLabel[String(value || "").toLowerCase()] || "Chưa có";
  }

  fetch("/api/mood-map")
    .then((res) => res.json())
    .then((data) => {
      const latest = data?.todayEntry || data?.latestEntry || null;
      if (!latest) {
        mineEl.textContent = "Bạn: Chưa có";
        partnerEl.textContent = "Cô ấy: Chưa có";
        metaEl.textContent = "Hôm nay chưa ghi mood. Bấm để cập nhật.";
        return;
      }
      mineEl.textContent = `Bạn: ${toLabel(latest.mineMood)}`;
      partnerEl.textContent = `Cô ấy: ${toLabel(latest.partnerMood)}`;
      const reasonBits = [];
      if (latest.mineReason) reasonBits.push(`Bạn: ${latest.mineReason}`);
      if (latest.partnerReason) reasonBits.push(`Cô ấy: ${latest.partnerReason}`);
      metaEl.textContent = reasonBits.length
        ? `Lý do: ${reasonBits.join(" | ")}`
        : `Ngày gần nhất: ${latest.date}`;
    })
    .catch(() => {
      mineEl.textContent = "Bạn: --";
      partnerEl.textContent = "Cô ấy: --";
      metaEl.textContent = "Không tải được dữ liệu mood map.";
    });
})();

