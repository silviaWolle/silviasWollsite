// ==========================================================================
// CONFIG: Hier wird die Verbindung zu deiner Firebase-Datenbank hergestellt
// ==========================================================================
const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_PROJEKT.firebaseapp.com",
    projectId: "DEIN_PROJEKT_ID",
    storageBucket: "DEIN_PROJEKT.appspot.com",
    messagingSenderId: "DEINE_SENDER_ID",
    appId: "DEINE_APP_ID"
};

// Firebase initialisieren (Das ist der Befehl, nach dem der Browser schreit!)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ==========================================================================
// AB HIER FOLGT DEIN BESTEHENDER CODE
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // ... hier geht dein Code ganz normal weiter wie bisher ...
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
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }    
        
        slides[slideIndex - 1].style.display = "block";  
        
        setTimeout(() => {
            showSlides();
        }, 5000); 
    }

    // ==========================================================================
    // 2. FIREBASE LOGIN-LOGIK
    // ==========================================================================
    const loginForm = document.getElementById("login-form"); 
    const emailInput = document.getElementById("email"); 
    const passwordInput = document.getElementById("password");
    const loginMessage = document.getElementById("login-message"); 

    if (loginForm) {
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;

            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    loginMessage.style.color = "green";
                    loginMessage.textContent = "Erfolgreich angemeldet! Weiterleitung...";
                    
                    setTimeout(() => {
                        window.location.href = "admin.html"; 
                    }, 1500);
                })
                .catch((error) => {
                    loginMessage.style.color = "#b56c70"; // Altrosa
                    
                    if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") {
                        loginMessage.textContent = "E-Mail oder Passwort ist falsch.";
                    } else if (error.code === "auth/invalid-email") {
                        loginMessage.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
                    } else {
                        loginMessage.textContent = "Fehler: " + error.message;
                    }
                });
        });
    }

    // ==========================================================================
    // 3. LIVE-BILDER AUS FIREBASE IN DAS GRID LADEN
    // ==========================================================================
    const firebaseContainer = document.getElementById("firebase-bilder-container");

    if (firebaseContainer) {
        firebase.firestore().collection("bilder").orderBy("hochgeladenAm", "desc")
            .onSnapshot((snapshot) => {
                firebaseContainer.innerHTML = "";
                
                snapshot.forEach((doc) => {
                    const daten = doc.data();
                    
                    const neueKarte = document.createElement("div");
                    neueKarte.classList.add("gallery-card", daten.kategorie);
                    
                    const tagAnzeige = daten.kategorie === "haekeln" ? "Häkeln" : "Stricken";
                    
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
                });
                
                // Aktualisiert die Filteransicht direkt nach dem Laden neuer Daten
                const aktiverButton = document.querySelector('.tab-btn.active');
                if (aktiverButton) {
                    const filterTyp = aktiverButton.getAttribute('onclick').match(/'([^']+)'/)[1];
                    wendeFilterAn(filterTyp);
                }
            }, (error) => {
                console.error("Fehler beim Laden der Firebase-Bilder: ", error);
            });
    }

    // ==========================================================================
    // 4. FIREBASE BILD-UPLOAD LOGIK (NEU FÜR ADMIN.HTML)
    // ==========================================================================
    const uploadForm = document.getElementById("upload-form");
    const uploadMessage = document.getElementById("upload-message");

    if (uploadForm) {
        uploadForm.addEventListener("submit", (event) => {
            event.preventDefault(); // Verhindert Neuladen der Seite

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

            // 1. Pfad im Firebase Storage definieren (Ordner "galerie/" + Zeitstempel + Dateiname)
            const speicherPfad = firebase.storage().ref("galerie/" + Date.now() + "_" + datei.name);

            // 2. Datei in den Storage hochladen
            speicherPfad.put(datei)
                .then((snapshot) => {
                    // 3. Download-URL vom hochgeladenen Bild holen
                    return snapshot.ref.getDownloadURL();
                })
                .then((downloadUrl) => {
                    // 4. Eintrag in die Firestore-Datenbank schreiben
                    return firebase.firestore().collection("bilder").add({
                        titel: titel,
                        kategorie: kategorie,
                        url: downloadUrl,
                        hochgeladenAm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    // Erfolg
                    uploadMessage.style.color = "green";
                    uploadMessage.textContent = "Bild erfolgreich hochgeladen und zur Galerie hinzugefügt!";
                    uploadForm.reset(); // Formular für den nächsten Upload leeren
                })
                .catch((error) => {
                    // Fehlerbehandlung
                    console.error("Upload-Fehler: ", error);
                    uploadMessage.style.color = "#b56c70";
                    uploadMessage.textContent = "Fehler beim Upload: " + error.message;
                });
        });
    }
});

// ==========================================================================
// 5. FILTER-FUNKTION (Global verfügbar für die HTML-Buttons)
// ==========================================================================
function neuerFilter(kategorie) {
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    const geklickterButton = document.querySelector(`[onclick="neuerFilter('${kategorie}')"]`);
    if (geklickterButton) {
        geklickterButton.classList.add("active");
    }

    wendeFilterAn(kategorie);
}

function wendeFilterAn(kategorie) {
    const alleKarten = document.querySelectorAll(".gallery-card");
    
    alleKarten.forEach(karte => {
        if (kategorie === "alle") {
            karte.style.display = "block";
        } else {
            if (karte.classList.contains(kategorie)) {
                karte.style.display = "block";
            } else {
                karte.style.display = "none";
            }
        }
    });
}
