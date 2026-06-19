// SUPABASE INITIALISIERUNG
const supabaseUrl = 'https://mehehlgisjldlwurxynu.supabase.co';
const supabaseKey = 'sb_publishable_ZMAXw-RG6-JIhjNPZgZKUg_JqMaLeyF';
const sbClient = supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // ADMIN-SCHUTZ & INAKTIVITÄTS-TIMER
    // ==========================================
    const adminCont = document.getElementById("admin-bilder-liste"); 
    const uploadForm = document.getElementById("upload-form");

    if (adminCont || uploadForm) {
        const { data: { session } } = await sbClient.auth.getSession();
        
        if (!session) {
            if (window.location.protocol !== "file:") {
                window.location.href = "login.html";
                return;
            } else {
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
            timer = setTimeout(logoutNachZeit, 10 * 60 * 1000); // 10 Minuten
        }

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
    // BILDVORSCHAU LOGIK (BEVOR UPLOAD)
    // ==========================================
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("bild-datei");
    const previewBox = document.getElementById("preview-box");
    const imagePreview = document.getElementById("image-preview");
    const removePreviewBtn = document.getElementById("remove-preview-btn");
    const dragText = document.getElementById("drag-zone-text");

    if (dropZone && fileInput) {
        dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
        dropZone.addEventListener("dragleave", () => { dropZone.classList.remove("dragover"); });
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                zeigeVorschau(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) { zeigeVorschau(e.target.files[0]); }
        });
    }

    function zeigeVorschau(file) {
        if (file && file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                if (previewBox) previewBox.style.display = "flex";
                if (dragText) dragText.textContent = `📁 ${file.name} ausgewählt`;
            };
            reader.readAsDataURL(file);
        }
    }

    if (removePreviewBtn && fileInput) {
        removePreviewBtn.addEventListener("click", () => {
            fileInput.value = "";
            if (previewBox) previewBox.style.display = "none";
            if (imagePreview) imagePreview.src = "";
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
            await sbClient.from('bilder').insert([{ titel, kategorie: kat, url: urlData.publicUrl, storage_path: path, highlight: false }]);
            
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
// GLOBALE FUNKTIONEN (HIGHLIGHTS, FILTER, LOGOUT)
// ==========================================

window.abmelden = async function() {
    await sbClient.auth.signOut();
    window.location.href = "login.html";
};

// Highlight-Status umschalten mit verbesserter Fehlermeldung
window.toggleHighlight = async function(id, aktuellerStatus) {
    const { error } = await sbClient.from('bilder').update({ highlight: !aktuellerStatus }).eq('id', id);
    if (error) {
        alert("⚠️ Fehler beim Ändern des Highlights!\n\nHast du im Supabase-Dashboard schon die Spalte 'highlight' (Typ: bool) angelegt?\n\nDetails: " + error.message);
    } else {
        ladeBilder(); 
    }
};

window.loescheBild = async function(id, path) {
    if (!confirm("Wirklich löschen?")) return;
    await sbClient.storage.from('bilder-mama').remove([path]);
    await sbClient.from('bilder').delete().eq('id', id);
    ladeBilder();
};

async function ladeBilder() {
    const cont = document.getElementById("bilder-container"); 
    const adminCont = document.getElementById("admin-bilder-liste"); 
    const highlightCont = document.getElementById("highlight-container"); 

    const haekelnGrid = document.querySelector("#haekeln .gallery-grid");
    const strickenGrid = document.querySelector("#stricken .gallery-grid");
    const malereienGrid = document.querySelector("#malereien .gallery-grid");

    document.querySelectorAll('.db-injected-item').forEach(el => el.remove());

    const { data } = await sbClient.from('bilder').select('*').order('created_at', { ascending: false });
    if (!data) return;

    if (cont) cont.innerHTML = "";
    if (adminCont) adminCont.innerHTML = "";

    // 1. HIGHLIGHT-BEREICH AUF DER STARTSEITE
    if (highlightCont) {
        const highlightBilder = data.filter(d => d.highlight === true);
        if (highlightBilder.length > 0) {
            highlightCont.style.display = "block";
            highlightCont.innerHTML = `
                <section class="album-section" style="background: #fdfbf7; padding: 25px; border: 2px dashed #b56c70; border-radius: 12px; margin-bottom: 40px;">
                    <h2 style="color: #b56c70; text-align: center; margin-bottom: 20px;">✨ Aktuell mein neues Projekt</h2>
                    <div class="gallery-grid">
                        ${highlightBilder.map(b => `
                            <div class="gallery-item">
                                <img src="${b.url}" alt="${b.titel}" style="width:100%; height:250px; object-fit:cover; display:block;">
                                <div class="item-info">
                                    <h3>${b.titel}</h3>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;
        } else {
            highlightCont.style.display = "none";
        }
    }

    // 2. ALLE BILDER AN IHRE JEWEILIGEN SEITEN VERTEILEN
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

        if (haekelnGrid || strickenGrid || malereienGrid) {
            const imgBox = document.createElement("div");
            imgBox.className = "gallery-item db-injected-item";
            imgBox.innerHTML = `
                <img src="${d.url}" alt="${d.titel}" style="width:100%; height:250px; object-fit:cover; display:block;">
                <div class="item-info">
                    <h3>${d.titel}</h3>
                </div>
            `;
            
            if (d.kategorie === "haekeln" && haekelnGrid) haekelnGrid.appendChild(imgBox);
            if (d.kategorie === "stricken" && strickenGrid) strickenGrid.appendChild(imgBox);
            if (d.kategorie === "malereien" && malereienGrid) malereienGrid.appendChild(imgBox);
        }

        // JETZT MIT BILD-ANSICHT (THUMBNAIL) IN DER ADMIN-LISTE
        if (adminCont) {
            const a = document.createElement("div");
            a.style = "display:flex; justify-content:space-between; padding:12px; border-bottom:1px solid #f4ece1; align-items:center; background: white; margin-bottom: 5px; border-radius: 6px; gap: 15px;";
            
            const hlText = d.highlight ? " <span style='color:#b56c70; font-weight:bold;'>[🔥 Projekt-Highlight]</span>" : "";
            const btnText = d.highlight ? "⭐ Highlight entfernen" : "✨ Als Highlight setzen";
            const btnColor = d.highlight ? "#7a6f62" : "#f4ece1";
            const btnTextColor = d.highlight ? "white" : "#7a6f62";

            a.innerHTML = `
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${d.url}" alt="${d.titel}" style="width:60px; height:60px; object-fit:cover; border-radius:4px; border:1px solid #f4ece1;">
                    <div><strong>${d.titel}</strong> <small>(${d.kategorie})</small>${hlText}</div>
                </div>
                <div style="display:flex; gap: 8px;">
                    <button onclick="toggleHighlight('${d.id}', ${d.highlight})" style="background: ${btnColor}; color: ${btnTextColor}; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight:600;">
                        ${btnText}
                    </button>
                    <button onclick="loescheBild('${d.id}', '${d.storage_path}')" style="background: #b56c70; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                        Löschen
                    </button>
                </div>
            `;
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
        if (k.classList.contains('db-injected-item')) return; 
        if (kat === "alle") {
            k.style.display = k.classList.contains("malereien") ? "none" : "";
        } else {
            k.style.display = k.classList.contains(kat) ? "" : "none";
        }
    });
};
