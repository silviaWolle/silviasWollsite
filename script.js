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
    const adminBilderContainer = document.getElementById("admin-bilder-liste"); // NEU: Container für Admin-Löschliste

    if (firebaseContainer || adminBilderContainer) {
        firebase.firestore().collection("bilder").orderBy("hochgeladenAm", "desc")
            .onSnapshot((snapshot) => {
                
                // Falls wir auf der Galerie-Seite sind
                if (firebaseContainer) {
                    firebaseContainer.innerHTML = "";
                }
                // Falls wir auf der Admin-Seite sind
                if (adminBilderContainer) {
                    adminBilderContainer.innerHTML = "";
                }
                
                snapshot.forEach((doc) => {
                    const daten = doc.data();
                    const docId = doc.id; // Die einzigartige Firebase-ID des Bildes
                    const tagAnzeige = daten.kategorie === "haekeln" ? "Häkeln" : "Stricken";
                    
                    // Variante A: Für die normale Galerie-Seite
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

                    // Variante B: Für die Admin-Verwaltungsliste mit LÖSCH-BUTTON
                    if (adminBilderContainer) {
                        const adminKarte = document.createElement("div");
                        adminKarte.className = "admin-delete-card";
                        adminKarte.style = "display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #f4ece1; border-radius: 8px; background: white; margin-bottom: 10px; gap: 15px;";
                        
                        adminKarte.innerHTML = `
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <img src="${daten.url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
                                <div>
                                    <h4 style="margin: 0; color: #7a6f62;">${daten.titel}</h4>
                                    <small style="color: #a89f91;">${tagAnzeige}</small>
                                </div>
                            </div>
                            <button onclick="loescheBild('${docId}', '${daten.url}')" style="background: #b56c70; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                                Löschen
                            </button>
                        `;
                        adminBilderContainer.appendChild(adminKarte);
                    }
                });
                
                // Filter triggern falls auf Galerie-Seite vorhanden
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
    // 4. FIREBASE BILD-UPLOAD LOGIK (FÜR ADMIN.HTML)
    // ==========================================================================
    const uploadForm = document.getElementById("upload-form");
    const uploadMessage = document.getElementById("upload-message");

    if (uploadForm) {
        uploadForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const titel = document.getElementById("bild-titel").value;
            const kategorie = document.getElementById("bild-kategorie").value;
            const datei = document.getElementById("bild-datei").files[0];

            if (!datei) {
                uploadMessage.style.color = "#b56c70";
                uploadMessage.textContent = "Bitte wähle zuerst ein Bild aus.";
                return;
            }

            uploadMessage.style.color = "orange";
            uploadMessage.textContent = "Bild wird hochgeladen... Bitte warten...";

            // Wir speichern den echten Dateinamen im Pfad, um ihn später gezielt löschen zu können
            const dateiName = Date.now() + "_" + datei.name;
            const speicherPfad = firebase.storage().ref("galerie/" + dateiName);

            speicherPfad.put(datei)
                .then((snapshot) => snapshot.ref.getDownloadURL())
                .then((downloadUrl) => {
                    return firebase.firestore().collection("bilder").add({
                        titel: titel,
                        kategorie: kategorie,
                        url: downloadUrl,
                        storagePath: "galerie/" + dateiName, // NEU: Pfad merken fürs Löschen
                        hochgeladenAm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    uploadMessage.style.color = "green";
                    uploadMessage.textContent = "Bild erfolgreich hochgeladen!";
                    uploadForm.reset();
                })
                .catch((error) => {
                    uploadMessage.style.color = "#b56c70";
                    uploadMessage.textContent = "Fehler beim Upload: " + error.message;
                });
        });
    }
});

// ==========================================================================
// 5. GLOBALE LÖSCH-FUNKTION (NEU)
// ==========================================================================
window.loescheBild = function(docId, bildUrl) {
    if (confirm("Möchtest du dieses Bild wirklich unwiderruflich löschen?")) {
        
        // Erst aus der Text-Datenbank entfernen
        firebase.firestore().collection("bilder").doc(docId).get()
            .then((doc) => {
                if (doc.exists && doc.data().storagePath) {
                    // Wenn wir den direkten Pfad haben, löschen wir die Datei im Storage
                    return firebase.storage().ref(doc.data().storagePath).delete();
                } else {
                    // Altes Fallback, falls kein Pfad existiert (löscht über die URL)
                    return firebase.storage().refFromURL(bildUrl).delete();
                }
            })
            .then(() => {
                // Danach den Eintrag aus Firestore löschen
                return firebase.firestore().collection("bilder").doc(docId).delete();
            })
            .then(() => {
                alert("Bild erfolgreich gelöscht!");
            })
            .catch((error) => {
                console.error("Fehler beim Löschen: ", error);
                // Falls die Datei im Storage nicht gefunden wurde, trotzdem aus Firestore löschen
                firebase.firestore().collection("bilder").doc(docId).delete();
            });
    }
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
