(function initFlightSuwonNoiBaiPage() {
  const TARGET_DATE = new Date("2026-07-30T00:00:00+07:00");
  const GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
  const SVG_WIDTH = 1200;
  const SVG_HEIGHT = 620;

  const SUWON = { lat: 37.2636, lng: 127.0286 };
  const NOI_BAI = { lat: 21.2212, lng: 105.8072 };

  const daysEl = document.getElementById("days");
  const hoursEl = document.getElementById("hours");
  const minutesEl = document.getElementById("minutes");
  const secondsEl = document.getElementById("seconds");
  const statusEl = document.getElementById("countdownStatus");
  const seoulTimeEl = document.getElementById("seoulTime");
  const vnTimeEl = document.getElementById("vnTime");

  const worldLayer = document.getElementById("worldLayer");
  const flightPath = document.getElementById("flightPath");
  const flightPathGlow = document.getElementById("flightPathGlow");
  const startMarker = document.getElementById("startMarker");
  const endMarker = document.getElementById("endMarker");
  const plane = document.querySelector(".plane");

  let flightTween = null;

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

  // Mercator conversion: lat/lng -> x/y in current SVG viewBox.
  function projectMercator(lat, lng, width, height) {
    const maxLat = 85.05112878;
    const clampedLat = Math.max(Math.min(lat, maxLat), -maxLat);
    const latRad = (clampedLat * Math.PI) / 180;

    const x = ((lng + 180) / 360) * width;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) * 0.5 * height;
    return { x, y };
  }

  function ringToPath(ring) {
    if (!Array.isArray(ring) || !ring.length) return "";
    const first = projectMercator(ring[0][1], ring[0][0], SVG_WIDTH, SVG_HEIGHT);
    let d = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`;
    for (let i = 1; i < ring.length; i += 1) {
      const p = projectMercator(ring[i][1], ring[i][0], SVG_WIDTH, SVG_HEIGHT);
      d += ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }
    return `${d} Z`;
  }

  function geometryToPath(geometry) {
    if (!geometry) return "";
    if (geometry.type === "Polygon") {
      return geometry.coordinates.map((ring) => ringToPath(ring)).join(" ");
    }
    if (geometry.type === "MultiPolygon") {
      return geometry.coordinates
        .map((polygon) => polygon.map((ring) => ringToPath(ring)).join(" "))
        .join(" ");
    }
    return "";
  }

  async function drawRealWorldMap() {
    const res = await fetch(GEOJSON_URL);
    const geo = await res.json();
    const features = Array.isArray(geo.features) ? geo.features : [];

    const fragment = document.createDocumentFragment();
    features.forEach((feature) => {
      const d = geometryToPath(feature.geometry);
      if (!d) return;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      fragment.appendChild(path);
    });
    worldLayer.innerHTML = "";
    worldLayer.appendChild(fragment);
  }

  function setMarker(marker, x, y) {
    marker.style.setProperty("--x", `${x}px`);
    marker.style.setProperty("--y", `${y}px`);
  }

  function buildFlightPath() {
    const start = projectMercator(SUWON.lat, SUWON.lng, SVG_WIDTH, SVG_HEIGHT);
    const end = projectMercator(NOI_BAI.lat, NOI_BAI.lng, SVG_WIDTH, SVG_HEIGHT);
    const midX = (start.x + end.x) / 2;
    const arcHeight = Math.max(48, Math.abs(start.x - end.x) * 0.22);
    const c1x = midX + 55;
    const c1y = Math.min(start.y, end.y) - arcHeight;
    const c2x = midX - 55;
    const c2y = Math.min(start.y, end.y) - arcHeight + 8;

    const d = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    flightPath.setAttribute("d", d);
    flightPathGlow.setAttribute("d", d);

    setMarker(startMarker, start.x, start.y);
    setMarker(endMarker, end.x, end.y);
    return d;
  }

  function startPlaneAnimation() {
    if (!window.gsap || !window.MotionPathPlugin) return;
    window.gsap.registerPlugin(window.MotionPathPlugin);

    if (flightTween) {
      flightTween.kill();
      flightTween = null;
    }

    flightTween = window.gsap.to(plane, {
      duration: 7.4,
      ease: "none",
      repeat: -1,
      motionPath: {
        path: "#flightPath",
        align: "#flightPath",
        alignOrigin: [0.5, 0.5],
        autoRotate: true
      }
    });
  }

  function render() {
    const now = new Date();
    const deltaSec = Math.floor((TARGET_DATE.getTime() - now.getTime()) / 1000);
    const isFuture = deltaSec >= 0;
    const parts = splitDuration(isFuture ? deltaSec : 0);

    daysEl.textContent = String(parts.days);
    hoursEl.textContent = pad2(parts.hours);
    minutesEl.textContent = pad2(parts.minutes);
    secondsEl.textContent = pad2(parts.seconds);

    if (isFuture) {
      statusEl.textContent = `Còn ${parts.days} ngày ${parts.hours} giờ ${parts.minutes} phút ${parts.seconds} giây tới 30/07/2026.`;
    } else {
      statusEl.textContent = "Finally Together ❤️";
    }

    seoulTimeEl.textContent = toClock("Asia/Seoul");
    vnTimeEl.textContent = toClock("Asia/Ho_Chi_Minh");
  }

  function cleanup() {
    if (flightTween) {
      flightTween.kill();
      flightTween = null;
    }
  }

  async function init() {
    try {
      await drawRealWorldMap();
      buildFlightPath();
      startPlaneAnimation();
    } catch (err) {
      statusEl.textContent = "Không tải được world map.";
    }
    render();
    setInterval(render, 1000);
  }

  window.addEventListener("beforeunload", cleanup);
  init();
})();
