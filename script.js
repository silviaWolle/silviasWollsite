// SUPABASE INITIALISIERUNG
const supabaseUrl = 'https://mehehlgisjldlwurxynu.supabase.co';
const supabaseKey = 'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF';
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // ADMIN-SCHUTZ & INAKTIVITÄTS-TIMER (OPTIMIERT FÜR LOKALES TESTEN)
    // ==========================================
    const adminCont = document.getElementById("admin-bilder-liste"); 
    const uploadForm = document.getElementById("upload-form");

    if (adminCont || uploadForm) {
        const { data: { session } } = await sbClient.auth.getSession();
        
        if (!session) {
            // Wenn wir NICHT lokal testen (sondern live auf GitHub), greift der Schutz streng:
            if (window.location.protocol !== "file:") {
                window.location.href = "login.html";
                return;
            } else {
                // Wenn wir lokal testen, zeigen wir nur eine Warnung in der Konsole, lassen dich aber rein!
                console.warn("Supabase-Session auf file:// nicht gefunden. Schutz wurde fürs lokale Testen umgangen.");
                starteInaktivitaetsTimer();
            }
        } else {
            starteInaktivitaetsTimer();
        }
    }

    let timer;
    function starteInaktivitaetsTimer() {
        function logoutNachZeit() {
            alert("Du wurdest nach 10 Minuten Inaktivität automatisch abgemeldet.");
            abmelden();
        }

        function timerZuruecksetzen() {
            clearTimeout(timer);
            timer = setTimeout(logoutNachZeit, 10 * 60 * 1000); // 10 Minuten in Millisekunden
        }

        // Bei jeder dieser Aktionen wird die Zeit von vorne gezählt:
        window.onload = timerZuruecksetzen;
        document.onmousemove = timerZuruecksetzen;
        document.onkeypress = timerZuruecksetzen;
        document.onclick = timerZuruecksetzen;
        document.onscroll = timerZuruecksetzen;
    }

    // ==========================================
    // DIASHOW
    // ==========================================
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

    // ==========================================
    // LOGIN-LOGIK
    // ==========================================
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

    // ==========================================
    // DRAG & DROP + BILDVORSCHAU LOGIK
    // ==========================================
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("bild-datei");
    const previewBox = document.getElementById("preview-box");
    const imagePreview = document.getElementById("image-preview");
    const removePreviewBtn = document.getElementById("remove-preview-btn");
    const dragText = document.getElementById("drag-zone-text");

    if (dropZone && fileInput) {
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("dragover");
        });

        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("dragover");
        });

        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                zeigeVorschau(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                zeigeVorschau(e.target.files[0]);
            }
        });
    }

    function zeigeVorschau(file) {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                previewBox.style.display = "flex";
                if (dragText) dragText.textContent = `📁 ${file.name} ausgewählt`;
            };
            reader.readAsDataURL(file);
        }
    }

    if (removePreviewBtn && fileInput) {
        removePreviewBtn.addEventListener("click", () => {
            fileInput.value = "";
            previewBox.style.display = "none";
            imagePreview.src = "";
            if (dragText) dragText.textContent = "📂 Datei hierher ziehen oder anklicken zum Auswählen";
        });
    }

    // ==========================================
    // UPLOAD-LOGIK
    // ==========================================
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
            if (previewBox) previewBox.style.display = "none";
            if (dragText) dragText.textContent = "📂 Datei hierher ziehen oder anklicken zum Auswählen";
            ladeBilder();
        });
    }
    ladeBilder();
});

// ==========================================
// GLOBALE FUNKTIONEN (LADEN, FILTER, LOGOUT)
// ==========================================

// NEU: Globale Abmelde-Funktion für Supabase
window.abmelden = async function() {
    await sbClient.auth.signOut();
    window.location.href = "login.html";
};

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
            k.className = "gallery-item " + d.kategorie; 
            k.innerHTML = `
                <img src="${d.url}" alt="${d.titel}" style="width:100%; height:250px; object-fit:cover; display:block;">
                <div class="item-info">
                    <h3>${d.titel}</h3>
                </div>
            `;
            cont.appendChild(k);
        }
        if (adminCont) {
            const a = document.createElement("div");
            a.style = "display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee; align-items:center;";
            a.innerHTML = `<span><strong>${d.titel}</strong> (${d.kategorie})</span><button onclick="loescheBild('${d.id}', '${d.storage_path}')">Löschen</button>`;
            adminCont.appendChild(a);
        }
    });

    if (cont) {
        const urlParams = new URLSearchParams(window.location.search);
        const filterParam = urlParams.get('filter');
        
        if (filterParam) {
            const targetBtn = Array.from(document.querySelectorAll(".tab-btn")).find(btn => 
                btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(`'${filterParam}'`)
            );
            neuerFilter(filterParam, targetBtn);
        } else {
            neuerFilter('alle');
        }
    }
}

window.loescheBild = async function(id, path) {
    if (!confirm("Wirklich löschen?")) return;
    await sbClient.storage.from('bilder-mama').remove([path]);
    await sbClient.from('bilder').delete().eq('id', id);
    ladeBilder();
};

window.neuerFilter = function(kat, element) {
    if (element) {
        document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
        element.classList.add("active");
    } else {
        document.querySelectorAll(".tab-btn").forEach(btn => {
            if (btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(`'${kat}'`)) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    }

    document.querySelectorAll(".gallery-item").forEach(k => {
        if (kat === "alle") {
            k.style.display = k.classList.contains("malereien") ? "none" : "";
        } else {
            k.style.display = k.classList.contains(kat) ? "" : "none";
        }
    });
};