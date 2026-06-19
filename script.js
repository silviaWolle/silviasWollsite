// Initialisierung von Supabase
const supabase = supabase.createClient(
  'https://mehehlgisjldlwurxynu.supabase.co',
  'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF'
);

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 2. BATCH-UPLOAD (Supabase Version)
    // ==========================================================================
    const uploadForm = document.getElementById("upload-form");
    const uploadMessage = document.getElementById("upload-message");

    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById("bild-datei");
            const dateien = fileInput.files;
            
            if (dateien.length === 0) return alert("Wähle Bilder aus!");

            uploadMessage.style.color = "orange";
            uploadMessage.textContent = `Lade ${dateien.length} Bilder hoch... bitte warten!`;

            const titelBasis = document.getElementById("bild-titel").value;
            const kategorie = document.getElementById("bild-kategorie").value;

            for (let i = 0; i < dateien.length; i++) {
                const datei = dateien[i];
                const titel = dateien.length > 1 ? `${titelBasis} ${i + 1}` : titelBasis;
                const dateiName = Date.now() + "_" + i + "_" + datei.name;

                // 1. In Supabase Storage hochladen
                const { error: uploadError } = await supabase.storage
                    .from('mama-datenbank')
                    .upload(dateiName, datei);

                if (uploadError) {
                    console.error("Upload Fehler:", uploadError.message);
                    continue;
                }

                // 2. Öffentliche URL holen
                const { data: publicUrlData } = supabase.storage
                    .from('mama-datenbank')
                    .getPublicUrl(dateiName);

                // 3. In Datenbank speichern
                await supabase.from('bilder').insert([
                    {
                        titel: titel,
                        kategorie: kategorie,
                        url: publicUrlData.publicUrl,
                        storage_path: dateiName,
                        is_highlight: false
                    }
                ]);
            }

            uploadMessage.style.color = "green";
            uploadMessage.textContent = "Alle Bilder erfolgreich hochgeladen!";
            uploadForm.reset();
        });
    }

    // ==========================================================================
    // 3. LIVE-DATEN LADEN (Supabase Realtime)
    // ==========================================================================
    async function ladeDaten() {
        const firebaseContainer = document.getElementById("bilder-container");
        const adminContainer = document.getElementById("admin-bilder-liste");

        const { data: bilder, error } = await supabase
            .from('bilder')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) return console.error(error);

        if (firebaseContainer) firebaseContainer.innerHTML = "";
        if (adminContainer) adminContainer.innerHTML = "";

        bilder.forEach(daten => {
            const docId = daten.id;
            const istHighlight = daten.is_highlight;

            // Öffentliche Galerie
            if (firebaseContainer) {
                const neueKarte = document.createElement("div");
                neueKarte.className = `gallery-card ${daten.kategorie}`;
                neueKarte.innerHTML = `
                    <div class="card-image-wrapper">
                        <img src="${daten.url}" alt="${daten.titel}" loading="lazy">
                    </div>
                    <div class="card-meta">
                        <span class="category-tag">${daten.kategorie}</span>
                        <h3>${daten.titel}</h3>
                    </div>
                `;
                firebaseContainer.appendChild(neueKarte);
            }

            // Admin-Liste
            if (adminContainer) {
                const div = document.createElement("div");
                div.style = "display: flex; padding: 10px; border: 1px solid #ddd; margin-bottom: 10px; background: white;";
                div.innerHTML = `
                    <img src="${daten.url}" style="width: 50px; height: 50px; object-fit: cover;">
                    <div style="flex-grow:1; padding-left:10px;">${daten.titel}</div>
                    <button onclick="loescheBild('${docId}', '${daten.storage_path}')">Löschen</button>
                `;
                adminContainer.appendChild(div);
            }
        });
    }

    ladeDaten();
});

// ==========================================================================
// GLOBALE FUNKTIONEN
// ==========================================================================
window.loescheBild = async (id, path) => {
    if(confirm("Wirklich löschen?")) {
        await supabase.storage.from('mama-datenbank').remove([path]);
        await supabase.from('bilder').delete().eq('id', id);
        location.reload();
    }
};
