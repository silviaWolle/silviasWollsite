// ==========================================================================
// SUPABASE KONFIGURATION (Keine Neudeklaration!)
// ==========================================================================
const supabaseUrl = 'https://mehehlgisjldlwurxynu.supabase.co';
const supabaseKey = 'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF';

// Wir verwenden die bereits vom CDN geladene supabase-Variable
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. DIASHOW
    let slideIndex = 0;
    const slides = document.getElementsByClassName("mySlides");
    
    function showSlides() {
        if (slides.length === 0) return; 
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";  
        }
        slideIndex++;
        if (slideIndex > slides.length) { slideIndex = 1; }   
        slides[slideIndex - 1].style.display = "block";  
        setTimeout(showSlides, 5000); 
    }
    showSlides();

    // 2. LOGIN-LOGIK
    const loginForm = document.getElementById("login-form"); 
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const msg = document.getElementById("login-message");

            const { error } = await sbClient.auth.signInWithPassword({ email, password });
            if (error) {
                msg.style.color = "#b56c70";
                msg.textContent = "Fehler: " + error.message;
            } else {
                msg.textContent = "Erfolgreich! Weiterleitung...";
                setTimeout(() => { window.location.href = "admin.html"; }, 1000);
            }
        });
    }

    // 3. LADEN & FILTERN
    ladeBilder();
});

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
            k.innerHTML = `<img src="${d.url}" alt="${d.titel}"><h3>${d.titel}</h3>`;
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

// 4. LÖSCHEN
window.loescheBild = async function(id, path) {
    if (!confirm("Wirklich löschen?")) return;
    await sbClient.storage.from('BILDER-MAMA').remove([path]);
    await sbClient.from('bilder').delete().eq('id', id);
    ladeBilder();
};

// 5. FILTER
window.neuerFilter = function(kat) {
    document.querySelectorAll(".gallery-card").forEach(k => {
        k.style.display = (kat === "alle" || k.classList.contains(kat)) ? "" : "none";
    });
};
