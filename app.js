const speciesFiles = {
  deer: "deer_seasons.json",
  moose: "moose_seasons.json",
  bear: "bear_seasons.json",
  wolf_coyote: "wolf_coyote_seasons.json",
  small_game: "small_game_seasons.json"
};

/* ------------------------------------
   MAP INITIALIZATION (Standard Basemap)
------------------------------------ */
let map = L.map("map", { zoomControl: false }).setView([50, -85], 4);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 12
}).addTo(map);

L.control.zoom({ position: "bottomright" }).addTo(map);

/* ------------------------------------
   WMU STYLES
------------------------------------ */
function defaultStyle() {
  return {
    color: "#4b5563",
    weight: 1,
    fillOpacity: 0
  };
}

function highlightStyle() {
  return {
    color: "#ff8800",
    weight: 4,
    fillOpacity: 0,
    opacity: 1
  };
}

/* ------------------------------------
   LOAD WMU GEOJSON
------------------------------------ */
let wmuLayer = null;
let wmuIndex = {};

function getWMUCodeFromFeature(feature) {
  if (!feature || !feature.properties) return null;
  return String(feature.properties.OFFICIAL_N || "").trim();
}

fetch("wmu.json")
  .then(res => res.json())
  .then(data => {
    wmuLayer = L.geoJSON(data, {
      style: defaultStyle,
      onEachFeature: (feature, layer) => {
        const code = getWMUCodeFromFeature(feature);
        if (code) {

          // store reference for highlight
          wmuIndex[code] = layer;

          // click polygon → select WMU
          layer.on("click", () => {
            document.getElementById("wmu-input").value = code;
            highlightWMU(code);
          });
        }
      }
    }).addTo(map);

    map.fitBounds(wmuLayer.getBounds(), { padding: [20, 20] });
  });

/* ------------------------------------
   HIGHLIGHT WMU
------------------------------------ */
function highlightWMU(code) {
  if (!wmuLayer) return false;

  wmuLayer.setStyle(defaultStyle);

  const layer = wmuIndex[code];
  if (!layer) return false;

  layer.setStyle(highlightStyle());
  map.fitBounds(layer.getBounds(), { padding: [20, 20] });

  return true;
}

/* ------------------------------------
   RESULTS PANEL
------------------------------------ */
const resultsPanel = document.getElementById("results-panel");
const resultsBody = document.getElementById("results");
const resultsTitle = document.getElementById("results-title");
const resultsClose = document.getElementById("results-close");

function openResults() {
  resultsPanel.classList.add("open");
}
function closeResults() {
  resultsPanel.classList.remove("open");
}
resultsClose.addEventListener("click", closeResults);

/* ------------------------------------
   BUTTON 1 — FIND WMU
------------------------------------ */
document.getElementById("btn-find-wmu").addEventListener("click", () => {
  const wmu = document.getElementById("wmu-input").value.trim();
  if (!wmu) return alert("Enter WMU first.");

  const ok = highlightWMU(wmu);
  if (!ok) alert("WMU not found on map.");
});

/* ------------------------------------
   BUTTON 2 — SHOW SEASONS
------------------------------------ */
document.getElementById("btn-show-regs").addEventListener("click", () => {
  const wmu = document.getElementById("wmu-input").value.trim();
  const species = document.getElementById("species-select").value;

  if (!wmu) return alert("Enter WMU first.");

  fetch(speciesFiles[species])
    .then(res => res.json())
    .then(data => {
      if (!data[wmu]) {
        resultsBody.innerHTML = `<p>No season data for WMU ${wmu}</p>`;
        openResults();
        return;
      }

      renderSeasons(wmu, species, data[wmu]);
    });
});

function renderSeasons(wmu, species, entry) {
  const titleText = `WMU ${wmu} — ${species.replace("_", " ").toUpperCase()}`;
  resultsTitle.textContent = titleText;

  let html = `<h2>${titleText}</h2>`;
  for (let cat in entry) {
    if (!entry[cat].length) continue;
    html += `<h3>${cat.toUpperCase()}</h3><ul>`;
    entry[cat].forEach(line => {
      html += `<li>${line}</li>`;
    });
    html += `</ul>`;
  }

  resultsBody.innerHTML = html;
  openResults();
}
