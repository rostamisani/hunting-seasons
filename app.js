
const speciesFiles = {
  deer: "deer_seasons.json",
  moose: "moose_seasons.json",
  bear: "bear_seasons.json",
  wolf_coyote: "wolf_coyote_seasons.json",
  small_game: "small_game_seasons.json"
};

// Leaflet map setup
let map = L.map('map', {
  zoomControl: false
}).setView([50, -85], 4);

// Base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 12,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

function defaultStyle() {
  return {
    color: "#666666",
    weight: 1,
    fillOpacity: 0
  };
}

function highlightStyle() {
  return {
    color: "#ff8800", // neon orange
    weight: 4,
    fillOpacity: 0,
    opacity: 1
  };
}

let wmuLayer = null;
const wmuIndex = {};

// Helper to get WMU code from feature properties
function getWMUCodeFromFeature(feature) {
  if (!feature || !feature.properties) return null;
  const props = feature.properties;
  const candidates = [
    props.WMU,
    props.WMU_ID,
    props.WMU_CODE,
    props.WMUNUM,
    props.WMU_NUM,
    props.wmu,
    props.wmu_id
  ];
  for (let c of candidates) {
    if (c !== undefined && c !== null && c !== "") {
      return String(c).trim();
    }
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
          // click also fills WMU
          layer.on('click', () => {
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
    console.error("Error loading WMU GeoJSON:", err);
  });

function highlightWMU(wmuCodeRaw) {
  if (!wmuLayer) return;
  const wmuCode = String(wmuCodeRaw).trim();

  wmuLayer.setStyle(defaultStyle);

  const layer = wmuIndex[wmuCode];
  if (layer) {
    layer.setStyle(highlightStyle());
    try {
      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    } catch (e) {
      console.warn("Could not fit bounds for WMU", wmuCode, e);
    }
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
document.getElementById("search-btn").addEventListener("click", () => {
  const wmuInput = document.getElementById("wmu-input").value.trim();
  const species = document.getElementById("species-select").value;

  if (!wmuInput) {
    showMessage("Please enter a WMU number.");
    return;
  }

  highlightWMU(wmuInput);

  const file = speciesFiles[species];
  fetch(file)
    .then(res => res.json())
    .then(data => {
      const entry = data[wmuInput];
      if (!entry) {
        showMessage(`No season data found for WMU ${wmuInput} and ${species}.`);
        return;
      }
      renderSeasons(wmuInput, species, entry);
    })
    .catch(err => {
      console.error("Error loading species JSON:", err);
      showMessage("Error loading season data. Please try again.");
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
