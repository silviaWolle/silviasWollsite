// ==========================================================================
// FIREBASE CONFIG (Direkt mit deinen Projektdaten ausgefüllt)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyCElOp1MeMJltkSQZHfLuE1UfwGtjm80jY",
    authDomain: "mamadatenbank.firebaseapp.com",
    projectId: "mamadatenbank",
    storageBucket: "mamadatenbank.firebasestorage.app",
    messagingSenderId: "1098331655605",
    appId: "1:1098331655605:web:0129125b707678202addfc",
    measurementId: "G-3C3FW8JDWK"
};

// Firebase initialisieren, falls es nicht schon läuft
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ==========================================================================
// SEITEN-LOGIK STARTET HIER
// ==========================================================================
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
                
                // Filter aktualisieren, falls einer aktiv ist
                const aktiverButton = document.querySelector('.tab-btn.active');
                if (aktiverButton) {
                    const onclickAttr = aktiverButton.getAttribute('onclick');
                    if (onclickAttr) {
                        const filterTyp = onclickAttr.match(/'([^']+)'/)[1];
                        wendeFilterAn(filterTyp);
                    }
                }
            }, (error) => {
                console.error("Fehler beim Laden der Firebase-Bilder: ", error);
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

            const speicherPfad = firebase.storage().ref("galerie/" + Date.now() + "_" + datei.name);

            speicherPfad.put(datei)
                .then((snapshot) => {
                    return snapshot.ref.getDownloadURL();
                })
                .then((downloadUrl) => {
                    return firebase.firestore().collection("bilder").add({
                        titel: titel,
                        kategorie: kategorie,
                        url: downloadUrl,
                        hochgeladenAm: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(() => {
                    uploadMessage.style.color = "green";
                    uploadMessage.textContent = "Bild erfolgreich hochgeladen und zur Galerie hinzugefügt!";
                    uploadForm.reset();
                })
                .catch((error) => {
                    console.error("Upload-Fehler: ", error);
                    uploadMessage.style.color = "#b56c70";
                    uploadMessage.textContent = "Fehler beim Upload: " + error.message;
                });
        });
    }
});

// ==========================================================================
// 5. FILTER-FUNKTION (Global für die HTML-Buttons registriert)
// ==========================================================================
window.neuerFilter = function(kategorie) {
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    const geklickterButton = document.querySelector(`[onclick="neuerFilter('${kategorie}')"]`);
    if (geklickterButton) {
        geklickterButton.classList.add("active");
    }

    wendeFilterAn(kategorie);
};

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
