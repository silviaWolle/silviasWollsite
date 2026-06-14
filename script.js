// Wartet, bis das gesamte HTML-Dokument geladen ist
document.addEventListener("DOMContentLoaded", () => {
    let slideIndex = 0;
    showSlides();

    function showSlides() {
        // Holt sich alle Elemente mit der Klasse "mySlides"
        const slides = document.getElementsByClassName("mySlides");
        
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
        setTimeout(showSlides, 5000); 
    }
});