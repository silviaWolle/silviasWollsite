// Initialisierung - NUR HIER definieren!
const supabase = supabase.createClient(
  'https://mehehlgisjldlwurxynu.supabase.co',
  'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF'
);

document.addEventListener("DOMContentLoaded", () => {
    
    // --- LOGIN ---
    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");
    const loginMessage = document.getElementById("login-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            if(loginMessage) loginMessage.textContent = "Verbinde...";

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

    // --- UPLOAD ---
    const uploadForm = document.getElementById("upload-form");
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById("bild-datei");
            const dateien = fileInput.files;
            if (dateien.length === 0) return;

            const titelBasis = document.getElementById("bild-titel").value;
            const kategorie = document.getElementById("bild-kategorie").value;

            for (let i = 0; i < dateien.length; i++) {
                const datei = dateien[i];
                const dateiName = Date.now() + "_" + i + "_" + datei.name;
                const { error: uploadError } = await supabase.storage.from('mama-datenbank').upload(dateiName, datei);
                
                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('mama-datenbank').getPublicUrl(dateiName);
                    await supabase.from('bilder').insert([{
                        titel: titelBasis,
                        kategorie: kategorie,
                        url: urlData.publicUrl,
                        storage_path: dateiName
                    }]);
                }
            }
            alert("Upload fertig!");
            location.reload();
        });
    }

    // --- ANZEIGE ---
    async function ladeDaten() {
        const container = document.getElementById("bilder-container");
        if (!container) return;
        const { data: bilder } = await supabase.from('bilder').select('*').order('created_at', { ascending: false });
        if (bilder) {
            container.innerHTML = bilder.map(d => `
                <div class="gallery-card ${d.kategorie}">
                    <img src="${d.url}" alt="${d.titel}">
                    <h3>${d.titel}</h3>
                </div>`).join('');
        }
    }
    ladeDaten();
});
