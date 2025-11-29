
const speciesFiles = {
  deer: "deer_seasons.json",
  moose: "moose_seasons.json",
  bear: "bear_seasons.json",
  wolf_coyote: "wolf_coyote_seasons.json",
  small_game: "small_game_seasons.json"
};

// Leaflet map with dark base layer
let map = L.map('map', {
  zoomControl: false
}).setView([50, -85], 4);

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 12,
  attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
}).addTo(map);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

function defaultStyle() {
  return {
    color: "#4b5563",
    weight: 1,
    fillOpacity: 0,
    className: "wmu-default"
  };
}

function highlightStyle() {
  return {
    color: "#f97316",
    weight: 5,
    fillOpacity: 0,
    opacity: 1,
    className: "wmu-default wmu-selected"
  };
}

let wmuLayer = null;
const wmuIndex = {};
let currentHighlightedLayer = null;

// Extract WMU code from properties (uses OFFICIAL_N)
function getWMUCodeFromFeature(feature) {
    if (!feature || !feature.properties) return null;
    return String(feature.properties.OFFICIAL_N || "").trim();
}
  return null;
}

// Load WMU GeoJSON
fetch("wmu.json")
  .then(res => res.json())
  .then(data => {
    wmuLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: (feature, layer) => {
        const code = getWMUCodeFromFeature(feature);
        if (code) {
          wmuIndex[code] = layer;

          // Label on hover
          layer.bindTooltip(`WMU ${code}`, {
            direction: "center",
            className: "wmu-label"
          });

          // Tap/click selects WMU
          layer.on("click", () => {
            document.getElementById("wmu-input").value = code;
            highlightWMU(code);
          });
        }
      }
    }).addTo(map);

    try {
      map.fitBounds(wmuLayer.getBounds(), { padding: [20, 20] });
    } catch (e) {
      console.warn("Could not fit bounds:", e);
    }
  })
  .catch(err => {
    console.error("Error loading wmu.json:", err);
  });

function clearHighlight() {
  if (!wmuLayer) return;
  wmuLayer.setStyle(defaultStyle);
  if (currentHighlightedLayer && currentHighlightedLayer._path) {
    currentHighlightedLayer._path.classList.remove("wmu-highlight");
  }
  currentHighlightedLayer = null;
}

function highlightWMU(wmuCodeRaw) {
  if (!wmuLayer) return false;
  const wmuCode = String(wmuCodeRaw).trim();

  clearHighlight();

  const layer = wmuIndex[wmuCode];
  if (layer) {
    layer.setStyle(highlightStyle());

    // Add animated neon glow via CSS class on the SVG path
    if (layer._path) {
      layer._path.classList.add("wmu-highlight");
    }

    try {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch (e) {
      console.warn("Could not fit bounds for WMU", wmuCode, e);
    }
    currentHighlightedLayer = layer;
    return true;
  }
  return false;
}

// Results slide panel
const resultsPanel = document.getElementById("results-panel");
const resultsBody = document.getElementById("results");
const resultsTitle = document.getElementById("results-title");
const resultsClose = document.getElementById("results-close");

function openResultsPanel() {
  resultsPanel.classList.add("open");
}

function closeResultsPanel() {
  resultsPanel.classList.remove("open");
}

resultsClose.addEventListener("click", (e) => {
  e.stopPropagation();
  closeResultsPanel();
});

// Search + seasons
document.getElementById("btn-find-wmu").addEventListener("click", () => {
    const wmuCode = document.getElementById("wmu-input").value.trim();
    if (!wmuCode) return alert("Enter WMU first");

    const found = highlightWMU(wmuCode);
    if (!found) {
        alert("WMU not found on map");
    }
});

// BUTTON 2 — SHOW HUNTING REGULATION
document.getElementById("btn-show-regs").addEventListener("click", () => {
    const wmu = document.getElementById("wmu-input").value.trim();
    const species = document.getElementById("species-select").value;

    if (!wmu) return alert("Enter WMU first");

    fetch(speciesFiles[species])
        .then(res => res.json())
        .then(data => {
            if (!data[wmu]) {
                showMessage("No data found for WMU " + wmu);
                return;
            }
            renderSeasons(wmu, species, data[wmu]);
        });
});
function showMessage(msg) {
  resultsTitle.textContent = "Message";
  resultsBody.innerHTML = `<p>${msg}</p>`;
  openResultsPanel();
}

function renderSeasons(wmu, species, entry) {
  const titleText = `WMU ${wmu} — ${species.replace("_", " ").toUpperCase()}`;
  resultsTitle.textContent = titleText;

  let html = `<h2>${titleText}</h2>`;
  for (let category in entry) {
    const lines = entry[category];
    if (!Array.isArray(lines) || lines.length === 0) continue;
    html += `<h3>${category.toUpperCase()}</h3><ul>`;
    for (let line of lines) {
      html += `<li>${line}</li>`;
    }
    html += `</ul>`;
  }
  resultsBody.innerHTML = html;
  openResultsPanel();
}
