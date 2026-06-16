// ==========================================================================
// FIREBASE INITIALISIERUNG
// ==========================================================================
if (typeof firebaseConfig !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 1. LOGIN-LOGIK, SITZUNGS-MANAGEMENT & LOGOUT (ENDGÜLTIG REPARIERT)
    // ==========================================================================
    const loginForm = document.getElementById("login-form");
    const logoutBtn = document.getElementById("logout-btn");
    
    if (typeof firebase.auth === "function") {
        
        // Status überwachen
        firebase.auth().onAuthStateChanged((user) => {
            
            if (user) {
                // Wenn wir das Login-Formular sehen (also auf der Login-Seite sind) -> ab zum Admin-Bereich
                if (loginForm) {
                    window.location.href = "admin.html";
                }
            } else {
                // Wenn wir den Logout-Button sehen (also im Admin-Bereich sind), aber NICHT eingeloggt sind:
                if (logoutBtn) {
                    // Falls der User sich gerade aktiv ausgeloggt hat, keine Warnung zeigen
                    if (!sessionStorage.getItem("gerade_ausgeloggt")) {
                        alert("Bitte logge dich zuerst ein!");
                    }
                    sessionStorage.removeItem("gerade_ausgeloggt");
                    window.location.href = "login.html";
                }
            }
        });

        // Login-Vorgang
        if (loginForm) {
            loginForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const email = document.getElementById("email").value;
                const password = document.getElementById("password").value;

                firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .then(() => {
                        return firebase.auth().signInWithEmailAndPassword(email, password);
                    })
                    .then(() => {
                        window.location.href = "admin.html";
                    })
                    .catch((error) => {
                        alert("Fehler beim Login: " + error.message);
                    });
            });
        }

        // Logout-Vorgang
        if (logoutBtn) {
            logoutBtn.addEventListener("click", (e) => {
                e.preventDefault();
                
                if (confirm("Möchtest du dich wirklich abmelden?")) {
                    sessionStorage.setItem("gerade_ausgeloggt", "true");
                    
                    firebase.auth().signOut()
                        .then(() => {
                            window.location.replace("index.html");
                        })
                        .catch((error) => {
                            alert("Fehler beim Abmelden: " + error.message);
                        });
                }
            });
        }
    }

    // ==========================================================================
    // 2. BATCH-UPLOAD (STABIL)
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
                const speicherPfad = firebase.storage().ref("galerie/" + dateiName);

                await speicherPfad.put(datei)
                    .then(s => s.ref.getDownloadURL())
                    .then(url => {
                        return firebase.firestore().collection("bilder").add({
                            titel: titel,
                            kategorie: kategorie,
                            url: url,
                            storagePath: "galerie/" + dateiName,
                            isHighlight: false,
                            hochgeladenAm: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
            }

            uploadMessage.style.color = "green";
            uploadMessage.textContent = "Alle Bilder erfolgreich hochgeladen!";
            uploadForm.reset();
        });
    }

    // ==========================================================================
    // 3. LIVE-DATEN LADEN (GALERIE & ADMIN-LISTE)
    // ==========================================================================
    const firebaseContainer = document.getElementById("bilder-container");
    const adminContainer = document.getElementById("admin-bilder-liste");

    if (firebaseContainer || adminContainer) {
        firebase.firestore().collection("bilder").orderBy("hochgeladenAm", "desc").onSnapshot(snap => {
            if (firebaseContainer) firebaseContainer.innerHTML = "";
            if (adminContainer) adminContainer.innerHTML = "";

            snap.forEach(doc => {
                const daten = doc.data();
                const docId = doc.id;
                const istHighlight = daten.isHighlight === true;

                let tagAnzeige = "Häkeln";
                if (daten.kategorie === "stricken") tagAnzeige = "Stricken";
                if (daten.kategorie === "malerei") tagAnzeige = "Malerei";

                // Öffentliche Galerie
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

                // Admin-Liste
                if (adminContainer) {
                    const sternFarbe = istHighlight ? "#FFD700" : "#ccc";
                    const div = document.createElement("div");
                    div.style = "display: flex; align-items: center; justify-content: space-between; padding: 10px; border: 1px solid #f4ece1; border-radius: 8px; margin-bottom: 10px; background: white;";
                    
                    div.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <img src="${daten.url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                            <div>
                                <h4 style="margin:0;">${daten.titel}</h4>
                                <small>${tagAnzeige}</small>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="setzeHighlight('${docId}')" style="background:white; border:1px solid #ddd; padding:5px 10px; border-radius:5px; cursor:pointer;">
                                <span style="color:${sternFarbe}; font-size:1.2rem;">★</span>
                            </button>
                            <button onclick="loescheBild('${docId}', '${daten.url}')" style="background:#b56c70; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">
                                Löschen
                            </button>
                        </div>
                    `;
                    adminContainer.appendChild(div);
                }
            });

            // Filter anwenden
            const aktiverButton = document.querySelector('.tab-btn.active');
            if (firebaseContainer && aktiverButton) {
                const onclickAttr = aktiverButton.getAttribute('onclick');
                if (onclickAttr) {
                    const filterTyp = onclickAttr.match(/'([^']+)'/)[1];
                    wendeFilterAn(filterTyp);
                }
            } else if (firebaseContainer) {
                wendeFilterAn("alle");
            }
        });
    }

    // ==========================================================================
    // 4. HIGHLIGHT ANZEIGE AUF DER STARTSEITE
    // ==========================================================================
    const highlightContainer = document.getElementById("highlight-container");
    if (highlightContainer) {
        firebase.firestore().collection("bilder").where("isHighlight", "==", true).limit(1).onSnapshot(snap => {
            if (snap.empty) { highlightContainer.style.display = "none"; return; }
            snap.forEach(doc => {
                const daten = doc.data();
                let tagAnzeige = "Häkeln";
                if (daten.kategorie === "stricken") tagAnzeige = "Stricken";
                if (daten.kategorie === "malerei") tagAnzeige = "Malerei";

                highlightContainer.style.display = "";
                highlightContainer.innerHTML = `
                    <div class="about-container" style="gap: 30px; margin-top: 20px;">
                        <img src="${daten.url}" alt="${daten.titel}" class="about-img" style="border-radius: 15px; width: 300px; height: 300px; object-fit: cover; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <div class="about-text">
                            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1.5px; color: #b56c70; font-weight: bold; display: block; margin-bottom: 5px;">Kunstwerk des Monats (${tagAnzeige})</span>
                            <h2 style="margin-top: 0;">${daten.titel}</h2>
                            <p>Hier präsentiere ich mein aktuelles Lieblingswerk!</p>
                            <a href="galerie.html" class="nav-btn active-nav" style="display: inline-block; margin-top: 10px; text-decoration: none;">Zur Galerie</a>
                        </div>
                    </div>
                `;
            });
        });
    }

    // ==========================================================================
    // 5. DIASHOW LOGIK
    // ==========================================================================
    const sliderBilder = document.querySelectorAll(".mySlides");
    if (sliderBilder.length > 0) {
        let aktuellesBildIndex = 0;

        sliderBilder.forEach(slide => slide.style.display = "none");

        function zeigeNaechstesBild() {
            sliderBilder[aktuellesBildIndex].style.display = "none";
            aktuellesBildIndex = (aktuellesBildIndex + 1) % sliderBilder.length;
            sliderBilder[aktuellesBildIndex].style.display = "block";
        }

        sliderBilder[0].style.display = "block";
        setInterval(zeigeNaechstesBild, 4000);
    }
});

// ==========================================================================
// GLOBALE STEUERUNGS-FUNKTIONEN (FILTER, LÖSCHEN, HIGHLIGHT)
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
            if (karte.classList.contains("malerei")) {
                karte.style.display = "none";
            } else {
                karte.style.display = "";
            }
        } else {
            karte.style.display = karte.classList.contains(kategorie) ? "" : "none";
        }
    });
}

window.loescheBild = (id, url) => {
    if(confirm("Dieses Werk wirklich löschen?")) {
        firebase.storage().refFromURL(url).delete().catch(e => console.log("Storage bereits leer"));
        firebase.firestore().collection("bilder").doc(id).delete();
    }
};

window.setzeHighlight = (neuesHighlightId) => {
    const db = firebase.firestore();
    db.collection("bilder").where("isHighlight", "==", true).get()
        .then((snapshot) => {
            const batch = db.batch();
            snapshot.forEach((doc) => { batch.update(db.collection("bilder").doc(doc.id), { isHighlight: false }); });
            batch.update(db.collection("bilder").doc(neuesHighlightId), { isHighlight: true });
            return batch.commit();
        });
};