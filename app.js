/* ------------------------------------
   Species JSON Sources
------------------------------------ */
const speciesFiles = {
  deer: "deer_seasons.json",
  moose: "moose_seasons.json",
  bear: "bear_seasons.json",
  wolf_coyote: "wolf_coyote_seasons.json",
  small_game: "small_game_seasons.json"
};

/* ------------------------------------
   MAP INITIALIZATION
------------------------------------ */
let map = L.map("map", { zoomControl: false }).setView([50, -85], 4);

// ⭐ FIXED — always-visible map (stable OSM tile server)
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 12
}).addTo(map);

// Add zoom control
L.control.zoom({ position: "bottomright" }).addTo(map);

/* ------------------------------------
   WMU POLYGON STYLE
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
    color: "#ff8800",  // neon orange
    weight: 4,
    opacity: 1,
    fillOpacity: 0
  };
}

/* ------------------------------------
   LOAD WMU GEOJSON
------------------------------------ */
let wmuLayer = null;
let wmuIndex = {};   // stores WMU → polygon reference

// Extract WMU code from the simplified GeoJSON (uses OFFICIAL_N)
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

          // Clicking polygon → sets WMU input + highlights
          layer.on("click", () => {
            document.getElementById("wmu-input").value = code;
            highlightWMU(code);
          });
        }
      }
    }).addTo(map);
