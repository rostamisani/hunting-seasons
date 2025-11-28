const speciesFiles = {
    deer: "deer_seasons.json",
    moose: "moose_seasons.json",
    bear: "bear_seasons.json",
    wolf_coyote: "wolf_coyote_seasons.json",
    small_game: "small_game_seasons.json"
};

document.getElementById("search-btn").addEventListener("click", () => {
    const wmu = document.getElementById("wmu-input").value.trim();
    const species = document.getElementById("species-select").value;
    const resultsDiv = document.getElementById("results");

    if (!wmu) {
        resultsDiv.innerHTML = "<p>Please enter WMU.</p>";
        return;
    }

    fetch(speciesFiles[species])
        .then(res => res.json())
        .then(data => {
            if (!data[wmu]) {
                resultsDiv.innerHTML = `<p>No data found for WMU ${wmu}.</p>`;
                return;
            }

            const categories = data[wmu];
            let html = `<h2>WMU ${wmu} — ${species.replace("_", " ").toUpperCase()}</h2>`;

            for (let cat in categories) {
                html += `<h3>${cat.toUpperCase()}</h3><ul>`;
                categories[cat].forEach(line => {
                    html += `<li>${line}</li>`;
                });
                html += "</ul>";
            }

            resultsDiv.innerHTML = html;
        });
});