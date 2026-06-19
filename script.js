// Initialisierung von Supabase
const supabase = supabase.createClient(
  'https://mehehlgisjldlwurxynu.supabase.co',
  'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF'
);

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 1. LOGIN & LOGOUT (Supabase Version)
    // ==========================================================================
    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert("Login fehlgeschlagen: " + error.message);
            } else {
                window.location.href = "admin.html";
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = "index.html";
        });
    }

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
            uploadMessage.textContent = `Lade ${dateien.length} Bilder hoch...`;

            const titelBasis = document.getElementById("bild-titel").value;
            const kategorie = document.getElementById("bild-kategorie").value;

            for (let i = 0; i < dateien.length; i++) {
                const datei = dateien[i];
                const dateiName = Date.now() + "_" + i + "_" + datei.name;

                const { error: uploadError } = await supabase.storage
                    .from('mama-datenbank')
                    .upload(dateiName, datei);

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('mama-datenbank').getPublicUrl(dateiName);
                    await supabase.from('bilder').insert([{
                        titel: dateien.length > 1 ? `${titelBasis} ${i + 1}` : titelBasis,
                        kategorie: kategorie,
                        url: urlData.publicUrl,
                        storage_path: dateiName,
                        is_highlight: false
                    }]);
                }
            }
            uploadMessage.style.color = "green";
            uploadMessage.textContent = "Upload abgeschlossen!";
            uploadForm.reset();
        });
    }

    // ==========================================================================
    // 3. DATEN LADEN & ANZEIGEN
    // ==========================================================================
    async function ladeDaten() {
        const firebaseContainer = document.getElementById("bilder-container");
        const adminContainer = document.getElementById("admin-bilder-liste");

        const { data: bilder } = await supabase.from('bilder').select('*').order('created_at', { ascending: false });

        if (firebaseContainer) {
            firebaseContainer.innerHTML = bilder.map(d => `
                <div class="gallery-card ${d.kategorie}">
                    <div class="card-image-wrapper"><img src="${d.url}" alt="${d.titel}"></div>
                    <div class="card-meta"><h3>${d.titel}</h3></div>
                </div>`).join('');
        }

        if (adminContainer) {
            adminContainer.innerHTML = bilder.map(d => `
                <div style="display:flex; padding:10px; border:1px solid #ddd; margin-bottom:5px;">
                    <img src="${d.url}" style="width:50px; height:50px; object-fit:cover;">
                    <span style="flex-grow:1; padding-left:10px;">${d.titel}</span>
                    <button onclick="loescheBild('${d.id}', '${d.storage_path}')">Löschen</button>
                </div>`).join('');
        }
    }

    if (document.getElementById("bilder-container") || document.getElementById("admin-bilder-liste")) {
        ladeDaten();
    }
});

// Globale Lösch-Funktion
window.loescheBild = async (id, path) => {
    if(confirm("Wirklich löschen?")) {
        await supabase.storage.from('mama-datenbank').remove([path]);
        await supabase.from('bilder').delete().eq('id', id);
        location.reload();
    }
};
