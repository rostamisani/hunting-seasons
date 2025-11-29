
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
  const props = feature.properties;
  if (props.OFFICIAL_N !== undefined && props.OFFICIAL_N !== null && props.OFFICIAL_N !== "") {
    return String(props.OFFICIAL_N).trim();
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
document.getElementById("search-btn").addEventListener("click", () => {
  const wmuInput = document.getElementById("wmu-input").value.trim();
  const species = document.getElementById("species-select").value;

  if (!wmuInput) {
    showMessage("Please enter a WMU number.");
    return;
  }

  const found = highlightWMU(wmuInput);

  const file = speciesFiles[species];
  fetch(file)
    .then(res => res.json())
    .then(data => {
      const entry = data[wmuInput];
      if (!entry) {
        const mapPart = found ? "" : " (and it may not exist on the map)";
        showMessage(`No season data found for WMU ${wmuInput} and ${species}.${mapPart}`);
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
