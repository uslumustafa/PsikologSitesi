// ===== DOM ELEMENTS =====
const header = document.getElementById('header');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const closeMenu = document.getElementById('close-menu');
const contactForm = document.getElementById('contact-form');
const submitText = document.getElementById('submit-text');
const submitLoader = document.getElementById('submit-loader');
const successMessage = document.getElementById('success-message');
const reveals = document.querySelectorAll('.section-fade-in');
const testimonials = document.querySelectorAll('.testimonial-slide');

// ===== ADMIN SETTINGS INTEGRATION =====
function loadAdminSettings() {
    try {
        // Admin panelinden kaydedilen ayarları oku
        const adminSettings = localStorage.getItem('adminSettings');
        if (adminSettings) {
            const settings = JSON.parse(adminSettings);
            applySettings(settings);
        }
    } catch (error) {
        console.log('Admin ayarları yüklenemedi:', error);
    }
}

function applySettings(settings) {
    // Site başlığını güncelle
    if (settings.siteTitle) {
        document.title = settings.siteTitle;
        const titleMeta = document.querySelector('meta[name="title"]');
        if (titleMeta) titleMeta.content = settings.siteTitle;
    }

    // Site açıklamasını güncelle
    if (settings.siteDescription) {
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.content = settings.siteDescription;
    }

    // Telefon numarasını güncelle
    if (settings.phone) {
        const phoneElements = document.querySelectorAll('[data-phone]');
        phoneElements.forEach(el => el.textContent = settings.phone);
    }

    // E-posta adresini güncelle
    if (settings.email) {
        const emailElements = document.querySelectorAll('[data-email]');
        emailElements.forEach(el => el.textContent = settings.email);
    }

    // Adres bilgisini güncelle
    if (settings.address) {
        const addressElements = document.querySelectorAll('[data-address]');
        addressElements.forEach(el => el.textContent = settings.address);
    }

    // Hakkımda bölümünü güncelle
    if (settings.aboutTitle) {
        const aboutTitle = document.querySelector('[data-about-title]');
        if (aboutTitle) aboutTitle.textContent = settings.aboutTitle;
    }

    if (settings.aboutDescription) {
        const aboutDesc = document.querySelector('[data-about-description]');
        if (aboutDesc) aboutDesc.textContent = settings.aboutDescription;
    }

    // İstatistikleri güncelle
    if (settings.experienceYears) {
        const expElements = document.querySelectorAll('[data-experience]');
        expElements.forEach(el => el.textContent = settings.experienceYears);
    }

    if (settings.totalClients) {
        const clientElements = document.querySelectorAll('[data-clients]');
        clientElements.forEach(el => el.textContent = settings.totalClients);
    }

    if (settings.successRate) {
        const successElements = document.querySelectorAll('[data-success-rate]');
        successElements.forEach(el => el.textContent = settings.successRate);
    }

    // Hizmetleri güncelle
    if (settings.services && Array.isArray(settings.services)) {
        const servicesContainer = document.querySelector('[data-services]');
        if (servicesContainer) {
            servicesContainer.innerHTML = settings.services.map(service =>
                `<li class="flex items-center mb-3">
                    <i class="fas fa-check-circle text-teal-600 mr-3"></i>
                    <span class="text-gray-700">${service}</span>
                </li>`
            ).join('');
        }
    }

    // Profil fotoğraflarını güncelle
    if (settings.mainPhoto) {
        const mainPhotoElements = document.querySelectorAll('[data-main-photo]');
        mainPhotoElements.forEach(el => {
            el.src = `images/${settings.mainPhoto}`;
            el.alt = 'Psikolog Onur Uslu';
        });
    }

    if (settings.officePhoto) {
        const officePhotoElements = document.querySelectorAll('[data-office-photo]');
        officePhotoElements.forEach(el => {
            el.src = `images/${settings.officePhoto}`;
            el.alt = 'Ofis Ortamı';
        });
    }

    console.log('Admin ayarları uygulandı!');
}

// ===== HEADER SCROLL EFFECT =====
window.addEventListener('scroll', function () {
    if (window.scrollY > 50) {
        header.classList.add('header-scrolled');
    } else {
        header.classList.remove('header-scrolled');
    }
});

// ===== MOBILE MENU =====
if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

if (closeMenu) {
    closeMenu.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
}

// Close mobile menu when clicking links
if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
        });
    });
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== REVEAL ON SCROLL =====
function revealOnScroll() {
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;

        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('visible');
        }
    });
}

window.addEventListener('scroll', revealOnScroll);
// Initial check
revealOnScroll();

// ===== BLOG MODAL FUNCTIONS =====
function openBlogModal(modalId) {
    const modal = document.getElementById(`modal-${modalId}`);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeBlogModal(modalId) {
    const modal = document.getElementById(`modal-${modalId}`);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
document.querySelectorAll('[id^="modal-"]').forEach(modal => {
    modal.addEventListener('click', function (e) {
        if (e.target === this) {
            this.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
});

// Make modal functions global
window.openBlogModal = openBlogModal;
window.closeBlogModal = closeBlogModal;

// ===== CONTACT FORM =====
if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Validate form before submission
        const inputs = this.querySelectorAll('input[required], textarea[required]');
        let isFormValid = true;

        inputs.forEach(input => {
            if (!validateField(input)) {
                isFormValid = false;
            }
        });

        if (!isFormValid) {
            // Show error message
            showErrorMessage('Lütfen tüm zorunlu alanları doğru şekilde doldurun.');
            return;
        }

        // Show loader
        submitText.style.display = 'none';
        submitLoader.style.display = 'block';

        // Get form data
        const formData = new FormData(this);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            subject: formData.get('subject'),
            message: formData.get('message')
        };

        try {
            // ===== BACKEND INTEGRATION =====
            // Option 1: Formspree (Disabled)
            /*
            const response = await fetch('https://formspree.io/f/mnnvrqop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            */

            // Option 2: Your custom backend
            const response = await fetch('http://localhost:5002/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Show success message
                showSuccessMessage('Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağım.');
                contactForm.reset();

                // Clear validation states
                inputs.forEach(input => {
                    input.classList.remove('border-red-500', 'border-green-500');
                    const error = input.parentElement.querySelector('.field-error');
                    if (error) error.remove();
                });
            } else {
                throw new Error('Form submission failed');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            showErrorMessage('Bir hata oluştu. Lütfen tekrar deneyin veya WhatsApp üzerinden iletişime geçin.');
        } finally {
            // Hide loader
            submitText.style.display = 'block';
            submitLoader.style.display = 'none';
        }
    });
}

// ===== MESSAGE DISPLAY FUNCTIONS =====
function showSuccessMessage(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');

    // Hide success message after 5 seconds
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 5000);
}

function showErrorMessage(message) {
    // Create or update error message
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
        contactForm.insertBefore(errorDiv, contactForm.firstChild);
    }

    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
    errorDiv.style.display = 'block';

    // Hide error message after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// ===== TYPING ANIMATION =====
const heroTitle = document.querySelector('#hero h1');
if (heroTitle) {
    const originalText = heroTitle.innerHTML;
    heroTitle.innerHTML = '';
    heroTitle.style.visibility = 'visible';

    let index = 0;
    function typeWriter() {
        if (index < originalText.length) {
            heroTitle.innerHTML = originalText.slice(0, index + 1);
            index++;
            setTimeout(typeWriter, 50);
        }
    }

    // Start typing after page load
    setTimeout(typeWriter, 500);
}

// ===== TESTIMONIAL SLIDER =====
let currentTestimonial = 0;

function showTestimonial(index) {
    testimonials.forEach(t => t.classList.remove('active'));
    if (testimonials[index]) {
        testimonials[index].classList.add('active');
    }
}

// Auto-rotate testimonials every 5 seconds
if (testimonials.length > 0) {
    setInterval(() => {
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        showTestimonial(currentTestimonial);
    }, 5000);
}

// ===== PARALLAX EFFECT =====
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelectorAll('.parallax');

    parallax.forEach(element => {
        const speed = element.dataset.speed || 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// ===== LAZY LOADING IMAGES =====
const images = document.querySelectorAll('img[data-src]');
const imageOptions = {
    threshold: 0,
    rootMargin: '0px 0px 300px 0px'
};

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
        }
    });
}, imageOptions);

images.forEach(img => imageObserver.observe(img));

// ===== FORM VALIDATION =====
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Add real-time validation
const emailInput = document.querySelector('input[type="email"]');
const phoneInput = document.querySelector('input[type="tel"]');

if (emailInput) {
    emailInput.addEventListener('blur', function () {
        if (!validateEmail(this.value)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#10b981';
        }
    });
}

if (phoneInput) {
    phoneInput.addEventListener('blur', function () {
        if (!validatePhone(this.value)) {
            this.style.borderColor = '#ef4444';
        } else {
            this.style.borderColor = '#10b981';
        }
    });
}

// ===== ANALYTICS (Google Analytics veya benzeri için) =====
function trackEvent(category, action, label) {
    // Google Analytics event tracking
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            'event_category': category,
            'event_label': label
        });
    }
}

// Track button clicks
document.querySelectorAll('.btn-primary').forEach(button => {
    button.addEventListener('click', function () {
        trackEvent('Button', 'Click', this.textContent);
    });
});

// ===== PAGE LOAD OPTIMIZATIONS =====
document.addEventListener('DOMContentLoaded', function () {
    // Hide loading screen after page load
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                document.body.classList.remove('loading');
            }, 500);
        }
    }, 1000);

    // Initialize AOS or other libraries if needed
    if (typeof AOS !== 'undefined') {
        AOS.init();
    }

    // Set current year in footer
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
});

// ===== ESCAPE KEY HANDLER =====
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        // Close all modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });

        // Close mobile menu
        if (mobileMenu && mobileMenu.classList.contains('active')) {
            mobileMenu.classList.remove('active');
        }
    }
});

// ===== PERFORMANCE MONITORING =====
window.addEventListener('load', function () {
    // Log page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    console.log('Page load time:', loadTime + 'ms');
});

// ===== COUNTER ANIMATION =====
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start);
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target;
        }
    }

    updateCounter();
}

// ===== INTERSECTION OBSERVER FOR COUNTERS =====
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('[data-count]');
            counters.forEach(counter => {
                const target = parseInt(counter.dataset.count);
                animateCounter(counter, target);
            });
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// ===== SCROLL TO TOP BUTTON =====
function createScrollToTopButton() {
    const button = document.createElement('button');
    button.innerHTML = '<i class="fas fa-arrow-up"></i>';
    button.className = 'fixed bottom-20 right-6 bg-primary text-white w-12 h-12 rounded-full shadow-lg hover:bg-primary-dark transition-all duration-300 z-40 opacity-0 pointer-events-none';
    button.id = 'scroll-to-top';
    button.title = 'Yukarı Çık';

    document.body.appendChild(button);

    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            button.classList.remove('opacity-0', 'pointer-events-none');
            button.classList.add('opacity-100');
        } else {
            button.classList.add('opacity-0', 'pointer-events-none');
            button.classList.remove('opacity-100');
        }
    });

    // Scroll to top functionality
    button.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// ===== ENHANCED FORM VALIDATION =====
function enhanceFormValidation() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea');

    inputs.forEach(input => {
        // Real-time validation
        input.addEventListener('input', function () {
            validateField(this);
        });

        // Focus effects
        input.addEventListener('focus', function () {
            this.parentElement.classList.add('focused');
        });

        input.addEventListener('blur', function () {
            this.parentElement.classList.remove('focused');
            validateField(this);
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let errorMessage = '';

    // Remove existing validation classes and error messages
    field.classList.remove('border-red-500', 'border-green-500');
    const existingError = field.parentElement.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }

    // Required field check
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Bu alan zorunludur';
    }
    // Email validation
    else if (type === 'email' && value) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(value)) {
            isValid = false;
            errorMessage = 'Geçerli bir e-posta adresi giriniz';
        }
    }
    // Phone validation
    else if (type === 'tel' && value) {
        const phonePattern = /^0[5][0-9]{9}$/;
        const cleanPhone = value.replace(/\D/g, '');
        if (!phonePattern.test(cleanPhone)) {
            isValid = false;
            errorMessage = 'Telefon numarası 0XXX XXX XX XX formatında olmalıdır';
        }
    }
    // Name validation
    else if (field.name === 'name' && value) {
        const namePattern = /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/;
        if (!namePattern.test(value)) {
            isValid = false;
            errorMessage = 'Ad soyad sadece harf içermelidir';
        } else if (value.length < 2) {
            isValid = false;
            errorMessage = 'Ad soyad en az 2 karakter olmalıdır';
        }
    }
    // Message validation
    else if (field.name === 'message' && value) {
        if (value.length > 500) {
            isValid = false;
            errorMessage = 'Mesaj en fazla 500 karakter olabilir';
        }
    }

    // Apply validation styling
    if (value) {
        field.classList.add(isValid ? 'border-green-500' : 'border-red-500');

        // Show error message
        if (!isValid && errorMessage) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error text-red-500 text-sm mt-1';
            errorDiv.textContent = errorMessage;
            field.parentElement.appendChild(errorDiv);
        }
    }

    return isValid;
}

// ===== INITIALIZE ENHANCED FEATURES =====
document.addEventListener('DOMContentLoaded', function () {
    // Create scroll to top button
    createScrollToTopButton();

    // Initialize form validation
    enhanceFormValidation();

    // Observe elements for counter animation
    const counterSection = document.querySelector('.counter-section');
    if (counterSection) {
        observer.observe(counterSection);
    }
});

// ===== SCROLL TO TOP FUNCTIONALITY =====
const scrollToTopBtn = document.getElementById('scroll-to-top');

// Show/hide scroll to top button based on scroll position
window.addEventListener('scroll', function () {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
});

// Scroll to top when button is clicked
scrollToTopBtn.addEventListener('click', function () {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// ===== PAGE LOAD =====
document.addEventListener('DOMContentLoaded', function () {
    // Admin ayarlarını yükle
    loadAdminSettings();

    // Her 5 saniyede bir admin ayarlarını kontrol et
    setInterval(loadAdminSettings, 5000);
});