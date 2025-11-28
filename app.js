// CLUPA + WMU viewer with hunting modal and neon-orange WMU highlight

const CLUPA_URL =
  "https://ws.lioservices.lrc.gov.on.ca/arcgis1071a/rest/services/LIO_OPEN_DATA/LIO_Open06/MapServer/5";

const $ = (sel) => document.querySelector(sel);

function showOverlay(id, msg, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
  if (isError) el.classList.add("map-overlay-error");
  else el.classList.remove("map-overlay-error");
}

function hideOverlay(id) {
  const el = $(id);
  if (!el) return;
  el.classList.add("hidden");
}

// Initialise map
const map = L.map("map").setView([50, -86], 5);

// Basemaps
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

const topo = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
  maxZoom: 17,
  attribution:
    'Map data: © OpenStreetMap contributors, SRTM | Map style: © OpenTopoMap'
});

// Basemap radios
document.querySelectorAll('input[name="basemap"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    if (input.value === "osm") {
      if (!map.hasLayer(osm)) map.addLayer(osm);
      if (map.hasLayer(topo)) map.removeLayer(topo);
    } else if (input.value === "topo") {
      if (!map.hasLayer(topo)) map.addLayer(topo);
      if (map.hasLayer(osm)) map.removeLayer(osm);
    }
  });
});

showOverlay("#map-loading", "Loading CLUPA General Use Areas…");

// CLUPA layer
let guaLayer = L.esri
  .featureLayer({
    url: CLUPA_URL,
    where: "DESIGNATION_ENG = 'General Use Area'",
    simplifyFactor: 0.5,
    precision: 4,
    style: () => ({
      color: "#b347ff",
      weight: 2,
      fillColor: "#b347ff",
      fillOpacity: 0.45
    }),
    onEachFeature: (feature, layer) => {
      const a = feature.properties || feature.attributes || {};
      const name = a.NAME_ENG || "General Use Area";
      const policy = a.POLICY_IDENT || "";
      const cat = a.CATEGORY_ENG || "";

      const html = `
        <div class="popup-content">
          <h3 class="popup-title">${name}</h3>
          <p class="popup-meta">
            <strong>Designation:</strong> ${a.DESIGNATION_ENG || "General Use Area"}<br/>
            <strong>Category:</strong> ${cat || "N/A"}<br/>
            <strong>Policy ID:</strong> ${policy || "N/A"}
          </p>
        </div>
      `;
      layer.bindPopup(html);
    }
  })
  .on("loading", () =>
    showOverlay("#map-loading", "Loading CLUPA General Use Areas…")
  )
  .on("load", () => hideOverlay("#map-loading"))
  .on("error", (err) => {
    console.error("CLUPA error:", err);
    showOverlay(
      "#map-error",
      "Error loading CLUPA layer. Try zooming or refreshing.",
      true
    );
  })
  .addTo(map);

// CLUPA toggle
const guaToggle = $("#gua-toggle");
if (guaToggle) {
  guaToggle.addEventListener("change", () => {
    if (guaToggle.checked) guaLayer.addTo(map);
    else map.removeLayer(guaLayer);
  });
}

// WMU layer + labels + highlight
let wmuLayer = null;
let wmuLabelLayer = L.layerGroup().addTo(map);
let wmuHighlightLayer = L.layerGroup().addTo(map);
let wmuIndexById = {};

// Color per WMU
function wmuColorFromCode(code) {
  if (!code) return "#00eaff";
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) & 0xffffffff;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue},70%,55%)`;
}

fetch("wmu.geojson")
  .then((res) => res.json())
  .then((data) => {
    wmuLayer = L.geoJSON(data, {
      style: (feature) => {
        const code = (feature.properties.OFFICIAL_N || "").toString().trim();
        const color = wmuColorFromCode(code);
        return {
          color,
          weight: 1.4,
          fillOpacity: 0
        };
      }
    }).addTo(map);

    // labels and search index
    wmuLabelLayer.clearLayers();
    wmuIndexById = {};

    wmuLayer.eachLayer((layer) => {
      const f = layer.feature;
      if (!f || !f.properties) return;
      const code = (f.properties.OFFICIAL_N || "").toString().trim();
      if (!code) return;

      const center = layer.getBounds().getCenter();
      const label = L.marker(center, {
        interactive: false,
        icon: L.divIcon({
          className: "wmu-label",
          html: code,
          iconSize: [30, 14]
        })
      });
      label.addTo(wmuLabelLayer);

      const key = code.toUpperCase();
      if (!wmuIndexById[key]) wmuIndexById[key] = [];
      wmuIndexById[key].push(layer);
    });
  })
  .catch((err) => {
    console.error("WMU load error:", err);
    showOverlay("#map-error", "Error loading WMU layer.", true);
  });

// WMU toggle
const wmuToggle = $("#wmu-toggle");
if (wmuToggle) {
  wmuToggle.addEventListener("change", () => {
    if (wmuToggle.checked) {
      if (wmuLayer && !map.hasLayer(wmuLayer)) map.addLayer(wmuLayer);
      if (!map.hasLayer(wmuLabelLayer)) map.addLayer(wmuLabelLayer);
    } else {
      if (wmuLayer && map.hasLayer(wmuLayer)) map.removeLayer(wmuLayer);
      if (map.hasLayer(wmuLabelLayer)) map.removeLayer(wmuLabelLayer);
      wmuHighlightLayer.clearLayers();
    }
  });
}

// WMU search and highlight
const wmuInput = $("#wmu-search-input");
const wmuLocateBtn = $("#wmu-locate-btn");
const wmuHuntBtn = $("#wmu-hunt-btn");
const wmuStatus = $("#wmu-search-status");
const huntingBtn = $("#hunting-btn");

let lastSearchedWMU = null;

// WMU search and highlight
const wmuInput = $("#wmu-search-input");
const wmuLocateBtn = $("#wmu-locate-btn");
const wmuHuntBtn = $("#wmu-hunt-btn");
const wmuStatus = $("#wmu-search-status");
const huntingBtn = $("#hunting-btn");

let lastSearchedWMU = null;

function locateWMU() {
  if (!wmuInput || !wmuIndexById) return;

  const raw = wmuInput.value.trim();
  if (!raw) {
    wmuStatus.textContent = "Enter a WMU number.";
    if (huntingBtn) huntingBtn.classList.add("hidden");
    lastSearchedWMU = null;
    if (wmuHighlightLayer) wmuHighlightLayer.clearLayers();
    return;
  }

  const code = raw.toUpperCase();
  const matches = wmuIndexById[code];

  if (!matches || matches.length === 0) {
    wmuStatus.textContent = `No WMU found for "${raw}".`;
    if (huntingBtn) huntingBtn.classList.add("hidden");
    lastSearchedWMU = null;
    if (wmuHighlightLayer) wmuHighlightLayer.clearLayers();
    return;
  }

  // Valid WMU found
  lastSearchedWMU = code;

  // Clear old highlight
  if (wmuHighlightLayer) {
    wmuHighlightLayer.clearLayers();
  }

  // Show hunting button immediately
  if (huntingBtn) {
    huntingBtn.classList.remove("hidden");
    huntingBtn.style.display = "block";
    huntingBtn.style.opacity = 1;
  }

  let bounds = null;
  matches.forEach((layer) => {
    const f = layer.feature;

    L.geoJSON(f, {
      style: {
        color: "#ff7700",
        weight: 3,
        fillOpacity: 0
      }
    }).addTo(wmuHighlightLayer);

    if (!bounds) bounds = layer.getBounds();
    else bounds.extend(layer.getBounds());
  });

  if (bounds) {
    map.fitBounds(bounds.pad(0.3));
    wmuStatus.textContent = `Highlighted WMU ${code}.`;
  }
}

if (wmuLocateBtn) {
  wmuLocateBtn.addEventListener("click", locateWMU);
}
if (wmuInput) {
  wmuInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") locateWMU();
  });
}

// Hunting Regulation button opens modal
if (wmuHuntBtn) {
  wmuHuntBtn.addEventListener("click", () => {
    if (!lastSearchedWMU) {
      wmuStatus.textContent = "Search and locate a WMU first.";
      return;
    }
    openModal();
  });
}

// Locate-me
const locateBtn = $("#locate-btn");
if (locateBtn) {
  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showOverlay("#map-error", "Geolocation not supported in this browser.", true);
      setTimeout(() => hideOverlay("#map-error"), 4000);
      return;
    }

    showOverlay("#map-loading", "Locating you…");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        hideOverlay("#map-loading");
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 10);
        L.circleMarker([latitude, longitude], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#4cc3ff",
          fillOpacity: 0.9
        })
          .addTo(map)
          .bindPopup("You are here (approximate).")
          .openPopup();
      },
      (err) => {
        console.error("Geolocation error:", err);
        hideOverlay("#map-loading");
        showOverlay(
          "#map-error",
          "Unable to get your location (permission denied or GPS error).",
          true
        );
        setTimeout(() => hideOverlay("#map-error"), 5000);
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30000
      }
    );
  });
}

// Hunting modal + JSON-backed seasons
const modalBackdrop = $("#hunting-modal-backdrop");
const modalTitle = $("#modal-title");
const modalWMU = $("#modal-wmu");
const modalContent = $("#modal-content");
const modalClose = $("#modal-close");

let currentSpecies = "deer";
let seasonsData = {
  deer: null,
  moose: null,
  bear: null,
  wolf: null,
  small_game: null
};

function openModal() {
  if (!lastSearchedWMU) {
    wmuStatus.textContent = "Search for a WMU first.";
    return;
  }
  modalTitle.textContent = "Hunting seasons";
  modalWMU.textContent = `WMU: ${lastSearchedWMU}`;
  modalContent.innerHTML = `<p class="panel-help">Choose a species to see seasons for this WMU.</p>`;
  modalBackdrop.classList.remove("hidden");
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
}

if (huntingBtn) {
  huntingBtn.addEventListener("click", openModal);
}
if (modalClose) {
  modalClose.addEventListener("click", closeModal);
}
if (modalBackdrop) {
  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) closeModal();
  });
}

// Load JSON for given species once
function ensureSpeciesLoaded(species, callback) {
  if (seasonsData[species]) {
    callback();
    return;
  }
  const fileMap = {
    deer: "deer_seasons.json",
    moose: "moose_seasons.json",
    bear: "bear_seasons.json",
    wolf: "wolf_coyote_seasons.json",
    small_game: "small_game_seasons.json"
  };
  const file = fileMap[species];
  fetch(file)
    .then((res) => res.json())
    .then((data) => {
      seasonsData[species] = data;
      callback();
    })
    .catch((err) => {
      console.error("Failed to load seasons JSON", species, err);
      modalContent.innerHTML =
        "<p>Could not load " + species + " seasons data. Please try again.</p>";
    });
}

// Render seasons for a given species and WMU
function renderSeasons(species) {
  currentSpecies = species;
  const buttons = document.querySelectorAll(".species-btn");
  buttons.forEach((btn) => {
    if (btn.dataset.species === species) btn.classList.add("active");
    else btn.classList.remove("active");
  });

  if (!lastSearchedWMU) {
    modalContent.innerHTML =
      '<p class="panel-help">Search for a WMU first, then open this window.</p>';
    return;
  }

  ensureSpeciesLoaded(species, () => {
    const data = seasonsData[species] || {};
    const record = data[lastSearchedWMU] || data[lastSearchedWMU.toLowerCase()];

    if (!record) {
      modalContent.innerHTML =
        "<p>No " +
        species.replace("_", " ") +
        " seasons loaded for WMU " +
        lastSearchedWMU +
        " yet. Please check the official regulations.</p>";
      return;
    }

    // Build HTML for deer (with bow/gun/controlled) and simpler lists for others
    let html = "";
    if (species === "deer") {
      html += "<h3>Deer seasons</h3>";
      if (record.bow) {
        html += "<h4>Bow-only</h4><ul>";
        record.bow.forEach((line) => {
          html += "<li>" + line + "</li>";
        });
        html += "</ul>";
      }
      if (record.firearms) {
        html += "<h4>Firearms</h4><ul>";
        record.firearms.forEach((line) => {
          html += "<li>" + line + "</li>";
        });
        html += "</ul>";
      }
      if (record.controlled) {
        html += "<h4>Controlled deer hunt</h4><ul>";
        record.controlled.forEach((line) => {
          html += "<li>" + line + "</li>";
        });
        html += "</ul>";
      }
    } else {
      html += "<h3>" + species.replace("_", " ") + " seasons</h3><ul>";
      (record.seasons || []).forEach((line) => {
        html += "<li>" + line + "</li>";
      });
      html += "</ul>";
    }

    modalContent.innerHTML = html;
  });
}

// Species button handlers
document.querySelectorAll(".species-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const species = btn.dataset.species;
    renderSeasons(species);
  });
});
