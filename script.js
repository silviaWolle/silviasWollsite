// ==========================================================================
// SUPABASE INITIALISIERUNG
// ==========================================================================
const supabase = supabase.createClient(
  'https://mehehlgisjldlwurxynu.supabase.co',
  'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF'
);

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. AUTOMATISCHE DIASHOW
    let slideIndex = 0;
    showSlides();

    function showSlides() {
        const slides = document.getElementsByClassName("mySlides");
        if (slides.length === 0) return; 
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";  
        }
        slideIndex++;
        if (slideIndex > slides.length) { slideIndex = 1; }   
        slides[slideIndex - 1].style.display = "block";  
        setTimeout(showSlides, 5000); 
    }

    // 2. SUPABASE LOGIN-LOGIK
    const loginForm = document.getElementById("login-form"); 
    if (loginForm) {
        const emailInput = document.getElementById("email"); 
        const passwordInput = document.getElementById("password");
        const loginMessage = document.getElementById("login-message"); 

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const { error } = await supabase.auth.signInWithPassword({
                email: emailInput.value,
                password: passwordInput.value
            });

            if (error) {
                loginMessage.style.color = "#b56c70";
                loginMessage.textContent = "Fehler: " + error.message;
            } else {
                loginMessage.style.color = "green";
                loginMessage.textContent = "Erfolgreich angemeldet!";
                setTimeout(() => { window.location.href = "admin.html"; }, 1500);
            }
        });
    }

    // 3. BILDER AUS SUPABASE LADEN
    ladeBilder();
});

async function ladeBilder() {
    const firebaseContainer = document.getElementById("bilder-container");
    const adminBilderContainer = document.getElementById("admin-bilder-liste"); 

    if (!firebaseContainer && !adminBilderContainer) return;

    const { data, error } = await supabase
        .from('bilder')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fehler beim Laden:", error);
        return;
    }

    if (firebaseContainer) firebaseContainer.innerHTML = "";
    if (adminBilderContainer) adminBilderContainer.innerHTML = "";

    data.forEach((daten) => {
        const tagAnzeige = daten.kategorie === "haekeln" ? "Häkeln" : "Stricken";
        
        if (firebaseContainer) {
            const neueKarte = document.createElement("div");
            neueKarte.classList.add("gallery-card", daten.kategorie);
            neueKarte.innerHTML = `
                <div class="card-image-wrapper">
                    <img src="${daten.url}" alt="${daten.titel}" loading="lazy">
                </div>
                <div class="card-meta">
                    <span class="category-tag">${tagAnzeige}</span>
                    <h3>${daten.titel}</h3>
                </div>
            `;
            firebaseContainer.appendChild(neueKarte);
        }

        if (adminBilderContainer) {
            const adminKarte = document.createElement("div");
            adminKarte.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #f4ece1; border-radius: 8px; background: white; margin-bottom: 10px;">
                    <img src="${daten.url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
                    <h4>${daten.titel}</h4>
                    <button onclick="loescheBild('${daten.id}', '${daten.storage_path}')" style="background: #b56c70; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">Löschen</button>
                </div>
            `;
            adminBilderContainer.appendChild(adminKarte);
        }
    });
}

// 4. BILD-UPLOAD
const uploadForm = document.getElementById("upload-form");
if (uploadForm) {
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById("bild-datei");
        const datei = fileInput.files[0];
        const titel = document.getElementById("bild-titel").value;
        const kategorie = document.getElementById("bild-kategorie").value;
        const uploadMessage = document.getElementById("upload-message");

        const dateiName = Date.now() + "_" + datei.name;

        // 1. In Storage hochladen
        const { error: storageError } = await supabase.storage
            .from('BILDER-MAMA')
            .upload(dateiName, datei);

        if (storageError) return alert("Fehler Storage: " + storageError.message);

        // 2. URL holen
        const { data: publicUrlData } = supabase.storage
            .from('BILDER-MAMA')
            .getPublicUrl(dateiName);

        // 3. In Datenbank speichern
        await supabase.from('bilder').insert([{
            titel: titel,
            kategorie: kategorie,
            url: publicUrlData.publicUrl,
            storage_path: dateiName
        }]);

        uploadMessage.textContent = "Upload erfolgreich!";
        ladeBilder();
    });
}

// 5. LÖSCHEN
window.loescheBild = async function(id, path) {
    if (!confirm("Wirklich löschen?")) return;
    await supabase.storage.from('BILDER-MAMA').remove([path]);
    await supabase.from('bilder').delete().eq('id', id);
    ladeBilder();
};

// 6. FILTER
window.neuerFilter = function(kategorie) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    event.target.classList.add("active");
    document.querySelectorAll(".gallery-card").forEach(k => {
        k.style.display = (kategorie === "alle" || k.classList.contains(kategorie)) ? "" : "none";
    });
};
