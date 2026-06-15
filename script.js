
document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================================================
    // 1. AUTOMATISCHE DIASHOW
    // ==========================================================================
    let slideIndex = 0;
    showSlides();

    function showSlides() {
        // Holt sich alle Elemente mit der Klasse "mySlides"
        const slides = document.getElementsByClassName("mySlides");
        
        // Verhindert Fehler auf Seiten ohne Diashow (z.B. Galerie- oder Login-Seite)
        if (slides.length === 0) return; 

        // Versteckt zuerst alle Bilder
        for (let i = 0; i < slides.length; i++) {
            slides[i].style.display = "none";  
        }
        
        // Springt zum nächsten Bild
        slideIndex++;
        
        // Wenn das Ende der Diashow erreicht ist, fang wieder von vorne an
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }    
        
        // Zeigt das aktuelle Bild an
        slides[slideIndex - 1].style.display = "block";  
        
        // Ruft die Funktion nach 5000 Millisekunden (5 Sekunden) erneut auf
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
            event.preventDefault(); // Verhindert Neuladen der Seite

            const email = emailInput.value;
            const password = passwordInput.value;

            // Firebase Login-Befehl
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Erfolg
                    loginMessage.style.color = "green";
                    loginMessage.textContent = "Erfolgreich angemeldet! Weiterleitung...";
                    
                    // Nach 1,5 Sekunden zur Admin-Seite weiterleiten
                    setTimeout(() => {
                        window.location.href = "admin.html"; 
                    }, 1500);
                })
                .catch((error) => {
                    // Fehlerbehandlung
                    loginMessage.style.color = "#b56c70"; // Altrosa
                    
                    // "auth/invalid-credential" für neuere Firebase-Standards hinzugefügt
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
    // 3. LIVE-BILDER AUS FIREBASE IN DAS REAL-GRID LADEN
    // ==========================================================================
    const firebaseContainer = document.getElementById("firebase-bilder-container");

    if (firebaseContainer) {
        firebase.firestore().collection("bilder").orderBy("hochgeladenAm", "desc")
            .onSnapshot((snapshot) => {
                // Den Container leeren, um doppelte Einträge bei Updates zu vermeiden
                firebaseContainer.innerHTML = "";
                
                snapshot.forEach((doc) => {
                    const daten = doc.data();
                    
                    // Erstellt eine neue Karte mit deinen exakten CSS-Klassen
                    const neueKarte = document.createElement("div");
                    neueKarte.classList.add("gallery-card", daten.kategorie);
                    
                    // Schöne Anzeige für das Tag ("Häkeln" statt "haekeln")
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
                    
                    // Ab ins Grid damit!
                    firebaseContainer.appendChild(neueKarte);
                });
                
                // Falls gerade ein Filter aktiv ist, wenden wir ihn kurz neu an,
                // damit das neue Bild sofort in der richtigen Kategorie landet
                const aktiverButton = document.querySelector('.tab-btn.active');
                if (aktiverButton) {
                    aktiverButton.click();
                }
            }, (error) => {
                console.error("Fehler beim Laden der Firebase-Bilder: ", error);
            });
    }
});