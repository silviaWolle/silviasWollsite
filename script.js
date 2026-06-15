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
                    // Nutzt exakt 'haekeln' oder 'stricken' für CSS-Klassen
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
});

// ==========================================================================
// 4. FILTER-FUNKTION (Global verfügbar für die HTML-Buttons)
// ==========================================================================
function neuerFilter(kategorie) {
    // 1. Aktiv-Status bei den Buttons umschalten
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    
    // Sucht den geklickten Button anhand des onclick-Attributs
    const geklickterButton = document.querySelector(`[onclick="neuerFilter('${kategorie}')"]`);
    if (geklickterButton) {
        geklickterButton.classList.add("active");
    }

    // 2. Filter auf alle Karten anwenden
    wendeFilterAn(kategorie);
}

// Hilfsfunktion, die das Ein- und Ausblenden übernimmt
function wendeFilterAn(kategorie) {
    const alleKarten = document.querySelectorAll(".gallery-card");
    
    alleKarten.forEach(karte => {
        if (kategorie === "alle") {
            karte.style.display = "block"; // Zeige alles
        } else {
            if (karte.classList.contains(kategorie)) {
                karte.style.display = "block"; // Gehört zur Kategorie
            } else {
                karte.style.display = "none"; // Gehört nicht dazu
            }
        }
    });
}
