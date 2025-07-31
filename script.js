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

    openModalButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault(); // Bağlantının varsayılan davranışını engelle
            const modalId = button.getAttribute('onclick').match(/'([^']+)'/)[1];
            document.getElementById(modalId).classList.remove('hidden');
        });
    });

    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.hidden') || button.closest('.fixed');
            modal.classList.add('hidden');
        });
    });
});

    document.querySelectorAll('.section-fade-in').forEach(section => {
        observer.observe(section);
    });

