// SUPABASE INITIALISIERUNG
const supabaseUrl = 'https://mehehlgisjldlwurxynu.supabase.co';
const supabaseKey = 'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF';
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    // 1. DIASHOW
    let slideIndex = 0;
    const slides = document.getElementsByClassName("mySlides");
    function showSlides() {
        if (slides.length === 0) return; 
        for (let i = 0; i < slides.length; i++) { slides[i].style.display = "none"; }
        slideIndex++;
        if (slideIndex > slides.length) { slideIndex = 1; }   
        slides[slideIndex - 1].style.display = "block";  
        setTimeout(showSlides, 5000); 
    }
    showSlides();

    // 2. LOGIN-LOGIK
    const loginForm = document.getElementById("login-form"); 
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const { error } = await sbClient.auth.signInWithPassword({ 
                email: document.getElementById("email").value, 
                password: document.getElementById("password").value 
            });
            if (error) { document.getElementById("login-message").textContent = error.message; }
            else { window.location.href = "admin.html"; }
        });
    }

    // 3. UPLOAD-LOGIK
    const uploadForm = document.getElementById("upload-form");
    if (uploadForm) {
        uploadForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const file = document.getElementById("bild-datei").files[0];
            const titel = document.getElementById("bild-titel").value;
            const kat = document.getElementById("bild-kategorie").value;
            const msg = document.getElementById("upload-message");

            msg.textContent = "Upload läuft...";
            const path = Date.now() + "_" + file.name;

            const { error: sErr } = await sbClient.storage.from('bilder-mama').upload(path, file);
            if (sErr) { msg.textContent = "Fehler: " + sErr.message; return; }

            const { data: urlData } = sbClient.storage.from('bilder-mama').getPublicUrl(path);
            await sbClient.from('bilder').insert([{ titel, kategorie: kat, url: urlData.publicUrl, storage_path: path }]);
            
            msg.textContent = "Erfolgreich hochgeladen!";
            uploadForm.reset();
            ladeBilder();
        });
    }
    ladeBilder();
});

// 4. LADEN & ANZEIGEN
async function ladeBilder() {
    const cont = document.getElementById("bilder-container");
    const adminCont = document.getElementById("admin-bilder-liste"); 
    if (!cont && !adminCont) return;

    const { data } = await sbClient.from('bilder').select('*').order('created_at', { ascending: false });
    if (!data) return;

    if (cont) cont.innerHTML = "";
    if (adminCont) adminCont.innerHTML = "";

    data.forEach(d => {
        if (cont) {
            const k = document.createElement("div");
            k.className = "gallery-card " + d.kategorie;
            k.innerHTML = `<img src="${d.url}" class="gallery-image" alt="${d.titel}"><h3>${d.titel}</h3>`;
            cont.appendChild(k);
        }
        if (adminCont) {
            const a = document.createElement("div");
            a.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;";
            a.innerHTML = `<span>${d.titel}</span><button onclick="loescheBild('${d.id}', '${d.storage_path}')">Löschen</button>`;
            adminCont.appendChild(a);
        }
    });
}

// 5. LÖSCHEN & FILTER
window.loescheBild = async function(id, path) {
    if (!confirm("Wirklich löschen?")) return;
    await sbClient.storage.from('bilder-mama').remove([path]);
    await sbClient.from('bilder').delete().eq('id', id);
    ladeBilder();
};

window.neuerFilter = function(kat) {
    document.querySelectorAll(".gallery-card").forEach(k => {
        k.style.display = (kat === "alle" || k.classList.contains(kat)) ? "" : "none";
    });
};
