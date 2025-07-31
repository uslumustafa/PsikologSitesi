document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = mobileMenu.querySelectorAll('a');

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu when a link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });

    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Fade-in sections on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    document.querySelectorAll('.section-fade-in').forEach(section => {
        observer.observe(section);
    });

    // Modal Açma ve Kapatma İşlevleri
    const openModalButtons = document.querySelectorAll('[onclick^="openModal"]');
    const closeModalButtons = document.querySelectorAll('[id^="close-modal"]');
    let scrollPosition = 0; // Sayfanın mevcut kaydırma pozisyonunu saklamak için

    // Modal açıldığında body kaydırmasını engelle
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');

        // Sayfanın mevcut kaydırma pozisyonunu al
        scrollPosition = window.scrollY;

        // Body'yi sabitle ve kaydırmayı engelle
        document.body.style.top = `-${scrollPosition}px`;
        document.body.classList.add('body-no-scroll');
    }

    // Modal kapandığında body kaydırmasını geri getir
    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('hidden');

        // Body'yi eski haline getir ve kaydırmayı geri yükle
        document.body.classList.remove('body-no-scroll');
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition); // Sayfayı eski pozisyona kaydır
    }

    // Modal açma butonları için
    openModalButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Bağlantının varsayılan davranışını engelle
            const modalId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            openModal(modalId);
        });
    });

    // Modal kapatma butonları için
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.id.replace('close-', '');
            closeModal(modalId);
        });
    });
});