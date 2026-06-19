
// ==========================================================================
// FIREBASE INITIALISIERUNG
// ==========================================================================
if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 1. AUTOMATISCHE DIASHOW
    // ==========================================================================
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

    // ==========================================================================
    // 2. FIREBASE LOGIN-LOGIK
    // ==========================================================================
    const loginForm = document.getElementById("login-form"); 
    if (loginForm) {
        const emailInput = document.getElementById("email"); 
        const passwordInput = document.getElementById("password");
        const loginMessage = document.getElementById("login-message"); 

        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            firebase.auth().signInWithEmailAndPassword(emailInput.value, passwordInput.value)
                .then(() => {
                    loginMessage.style.color = "green";
                    loginMessage.textContent = "Erfolgreich angemeldet! Weiterleitung...";
                    setTimeout(() => { window.location.href = "admin.html"; }, 1500);
                })
                .catch((error) => {
                    loginMessage.style.color = "#b56c70";
                    loginMessage.textContent = "Fehler: " + error.message;
                });
        });
    }

    // ==========================================================================
    // 3. BILDER AUS FIREBASE LADEN (Für Galerie & Admin-Vorschau)
    // ==========================================================================
    const firebaseContainer = document.getElementById("bilder-container");
    const adminBilderContainer = document.getElementById("admin-bilder-liste"); 

    if (firebaseContainer || adminBilderContainer) {
        firebase.firestore().collection("bilder").orderBy("hochgeladenAm", "desc")
            .onSnapshot((snapshot) => {
                
                if (firebaseContainer) {
                    firebaseContainer.innerHTML = "";
                }
                if (adminBilderContainer) {
                    adminBilderContainer.innerHTML = "";
                }
                
                snapshot.forEach((doc) => {
                    const daten = doc.data();
                    const docId = doc.id; 
                    const tagAnzeige = daten.kategorie === "haekeln" ? "Häkeln" : "Stricken";
                    const istHighlight = daten.isHighlight === true;
                    
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
                        adminKarte.className = "admin-delete-card";
                        
                        const sternFarbe = istHighlight ? "#FFD700" : "#ccc";
                        const sternRand = istHighlight ? "2px solid #FFD700" : "1px solid #f4ece1";
                        const sternTitel = istHighlight ? "Aktuelles Highlight auf Startseite" : "Als Highlight auf Startseite setzen";

                        adminKarte.style = "display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #f4ece1; border-radius: 8px; background: white; margin-bottom: 10px; gap: 15px;";
                        
                        adminKarte.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <img src="${daten.url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
                                <div>
                                    <h4 style="margin: 0; color: #7a6f62;">${daten.titel}</h4>
                                    <small style="color: #a89f91;">${tagAnzeige}</small>
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <button onclick="setzeHighlight('${docId}')" title="${sternTitel}" style="background: white; border: ${sternRand}; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 1.1rem; transition: all 0.2s;">
                                    <span style="color: ${sternFarbe};">&#9733;</span>
                                </button>
                                <button onclick="loescheBild('${docId}', '${daten.url}')" style="background: #b56c70; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                    Löschen
                                </button>
                            </div>
                        `;
                        adminBilderContainer.appendChild(adminKarte);
                    }
                });
                
                const aktiverButton = document.querySelector('.tab-btn.active');
                if (firebaseContainer && aktiverButton) {
                    const onclickAttr = aktiverButton.getAttribute('onclick');
                    if (onclickAttr) {
                        const filterTyp = onclickAttr.match(/'([^']+)'/)[1];
                        wendeFilterAn(filterTyp);
                    }
                }
            });
    }

    // ==========================================================================
    // ABSOLUT ROBUSTE DRAG & DROP LOGIK & BILDVORSCHAU (FÜR ADMIN.HTML)
    // ==========================================================================
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("bild-datei");
    const previewBox = document.getElementById("preview-box");
    const imagePreview = document.getElementById("image-preview");
    const removePreviewBtn = document.getElementById("remove-preview-btn");
    const dragZoneText = document.getElementById("drag-zone-text");

    if (dropZone && fileInput) {
        
        // Verhindert global im ganzen Browser-Fenster das automatische Öffnen von reingezogenen Bildern
        window.addEventListener("dragover", (e) => { e.preventDefault(); }, false);
        window.addEventListener("drop", (e) => { e.preventDefault(); }, false);

        // Visueller Effekt, wenn die Datei über das gestrichelte Feld gehalten wird
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.add('dragover');
            }, false);
        });

        // Visueller Effekt verschwindet wieder
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.classList.remove('dragover');
            }, false);
        });

        // WICHTIG: Fängt die Datei ab, wenn sie auf dem Feld losgelassen wird!
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const dt = e.dataTransfer;
            const dateien = dt.files;

            if (dateien && dateien.length > 0) {
                fileInput.files = dateien; // Schreibt die Datei ins unsichtbare Datei-Input
                zeigeBildVorschau();       // Löst die Bildvorschau aus
            }
        });

        // Fallback: Wenn man ganz normal auf das Feld klickt und eine Datei auswählt
        fileInput.addEventListener('change', zeigeBildVorschau);

        function zeigeBildVorschau() {
            const datei = fileInput.files[0];
            if (datei && datei.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.readAsDataURL(datei);
                reader.onloadend = () => {
                    imagePreview.src = reader.result;
                    previewBox.style.display = "flex";
                    dragZoneText.textContent = `✅ ${datei.name} ausgewählt!`;
                }
            } else {
                versteckeVorschau();
            }
        }

        if (removePreviewBtn) {
            removePreviewBtn.addEventListener('click', () => {
                versteckeVorschau();
            });
        }

        function versteckeVorschau() {
            fileInput.value = ""; 
            imagePreview.src = "";
            previewBox.style.display = "none";
            dragZoneText.textContent = "📂 Datei hierher ziehen oder anklicken zum Auswählen";
        }
    }

    // ==========================================================================
    // 4. FIREBASE BILD-UPLOAD LOGIK (FÜR ADMIN.HTML)
    // ==========================================================================
    const uploadForm = document.getElementById("upload-form");
    const uploadMessage = document.getElementById("upload-message");

    if (uploadForm) {
        uploadForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const titel = document.getElementById("bild-titel").value;
            const kategorie = document.getElementById("bild-kategorie").value;
            const datei = fileInput.files[0];

            if (!datei) {
                uploadMessage.style.color = "#b56c70";
                uploadMessage.textContent = "Bitte wähle zuerst ein Bild aus.";
                return;
            }

            uploadMessage.style.color = "orange";
            uploadMessage.textContent = "Bild wird hochgeladen... Bitte warten...";

            const dateiName = Date.now() + "_" + datei.name;
            const speicherPfad = firebase.storage().ref("galerie/" + dateiName);

            speicherPfad.put(datei)
                .then((snapshot) => snapshot.ref.getDownloadURL())
                .then((downloadUrl) => {
                    return firebase.firestore().collection("bilder").add({
                        titel: titel,
                        kategorie: kategorie,
                        url: downloadUrl,
                        storagePath: "galerie/" + dateiName, 
                        isHighlight: false, 
                        hochgeladenAm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    uploadMessage.style.color = "green";
                    uploadMessage.textContent = "Bild erfolgreich hochgeladen!";
                    uploadForm.reset();
                    if (typeof versteckeVorschau === "function") versteckeVorschau(); 
                })
                .catch((error) => {
                    uploadMessage.style.color = "#b56c70";
                    uploadMessage.textContent = "Fehler beim Upload: " + error.message;
                });
        });
    }

    // ==========================================================================
    // HIGHLIGHT LIVE AUF DER STARTSEITE AUSLESEN
    // ==========================================================================
    const highlightContainer = document.getElementById("highlight-container");
    if (highlightContainer) {
        firebase.firestore().collection("bilder").where("isHighlight", "==", true).limit(1)
            .onSnapshot((snapshot) => {
                if (snapshot.empty) {
                    highlightContainer.style.display = "none";
                    return;
                }

                snapshot.forEach((doc) => {
                    const daten = doc.data();
                    const tagAnzeige = daten.kategorie === "haekeln" ? "Häkeln" : "Stricken";
                    highlightContainer.style.display = ""; 
                    
                    highlightContainer.innerHTML = `
                        <div class="about-container" style="gap: 30px; margin-top: 20px;">
                            <img src="${daten.url}" alt="${daten.titel}" class="about-img" style="border-radius: 15px; width: 300px; height: 300px; object-fit: cover; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                            <div class="about-text">
                                <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; color: #b56c70; font-weight: bold; display: block; margin-bottom: 5px;">${tagAnzeige} des Monats</span>
                                <h2 style="margin-top: 0;">${daten.titel}</h2>
                                <p>Dieses Prachtstück habe ich aktuell als mein persönliches Lieblingswerk ausgewählt! Schau auch gerne in der Galerie vorbei, um noch mehr Kreationen zu entdecken.</p>
                                <a href="galerie.html" class="nav-btn active-nav" style="display: inline-block; margin-top: 10px; text-decoration: none;">Zur gesamten Galerie</a>
                            </div>
                        </div>
                    `;
                });
            });
    }
});

// ==========================================================================
// 5. GLOBALE LÖSCH-FUNKTION
// ==========================================================================
window.loescheBild = function(docId, bildUrl) {
    if (confirm("Möchtest du dieses Bild wirklich unwiderruflich löschen?")) {
        
        firebase.firestore().collection("bilder").doc(docId).get()
            .then((doc) => {
                if (doc.exists && doc.data().storagePath) {
                    return firebase.storage().ref(doc.data().storagePath).delete();
                } else {
                    return firebase.storage().refFromURL(bildUrl).delete();
                }
            })
            .then(() => {
                return firebase.firestore().collection("bilder").doc(docId).delete();
            })
            .then(() => {
                alert("Bild erfolgreich gelöscht!");
            })
            .catch((error) => {
                console.error("Fehler beim Löschen: ", error);
                firebase.firestore().collection("bilder").doc(docId).delete();
            });
    }
};

// ==========================================================================
// GLOBALE HIGHLIGHT-SCHALT-FUNKTION FOR ADMIN
// ==========================================================================
window.setzeHighlight = function(neuesHighlightId) {
    const db = firebase.firestore();
    
    db.collection("bilder").where("isHighlight", "==", true).get()
        .then((snapshot) => {
            const batch = db.batch();
            
            snapshot.forEach((doc) => {
                batch.update(db.collection("bilder").doc(doc.id), { isHighlight: false });
            });
            
            batch.update(db.collection("bilder").doc(neuesHighlightId), { isHighlight: true });
            
            return batch.commit();
        })
        .then(() => {
            console.log("Highlight erfolgreich gewechselt!");
        })
        .catch((error) => {
            console.error("Fehler beim Wechseln des Highlights: ", error);
        });
};

// ==========================================================================
// 6. FILTER-FUNKTION
// ==========================================================================
window.neuerFilter = function(kategorie) {
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    const geklickterButton = document.querySelector(`[onclick="neuerFilter('${kategorie}')"]`);
    if (geklickterButton) { geklickterButton.classList.add("active"); }
    wendeFilterAn(kategorie);
};

function wendeFilterAn(kategorie) {
    const alleKarten = document.querySelectorAll(".gallery-card");
    alleKarten.forEach(karte => {
        if (kategorie === "alle") {
            karte.style.display = ""; 
        } else {
            karte.style.display = karte.classList.contains(kategorie) ? "" : "none";
        }
    });
}