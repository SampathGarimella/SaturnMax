/* =========================================================
   SA Turn Max Consulting Services — script.js
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  /* ---- Navbar scroll effect ---- */
  const navbar = document.getElementById('navbar');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
      backToTop.classList.add('visible');
    } else {
      navbar.classList.remove('scrolled');
      backToTop.classList.remove('visible');
    }
  });

  /* ---- Mobile hamburger menu ---- */
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  // Close menu when a nav link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  /* ---- Active nav link on scroll ---- */
  const sections = document.querySelectorAll('section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
    });
    navLinks.querySelectorAll('a[href^="#"]').forEach(a => {
      a.style.color = a.getAttribute('href') === `#${current}`
        ? 'var(--gold)'
        : '';
    });
  }, { passive: true });

  /* ---- Animated stat counters ---- */
  const statNums = document.querySelectorAll('.stat-num');
  let counted = false;

  function runCounters() {
    statNums.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      const duration = 1800;
      const stepTime = Math.floor(duration / target);
      let current = 0;
      const timer = setInterval(() => {
        current += Math.ceil(target / 60);
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = current;
      }, duration / 60);
    });
  }

  const heroSection = document.querySelector('.hero');
  const counterObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && !counted) {
      counted = true;
      runCounters();
    }
  }, { threshold: 0.3 });
  if (heroSection) counterObserver.observe(heroSection);

  /* ---- Scroll reveal ---- */
  const revealElements = document.querySelectorAll(
    '.service-card, .industry-card, .why-card, .team-card, .step, ' +
    '.about-content, .about-image, .contact-info, .contact-form-wrap, ' +
    '.section-header, .cta-inner'
  );

  revealElements.forEach((el, i) => {
    el.classList.add('reveal');
    const delay = (i % 4);
    if (delay > 0) el.classList.add(`reveal-delay-${delay}`);
  });

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ---- Testimonial slider ---- */
  const testimonials = document.querySelectorAll('.testimonial');
  const dotsContainer = document.getElementById('sliderDots');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  let current = 0;
  let autoplayTimer;

  // Build dots
  testimonials.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('dot');
    dot.setAttribute('aria-label', `Testimonial ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  const dots = dotsContainer.querySelectorAll('.dot');

  function goTo(index) {
    testimonials[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + testimonials.length) % testimonials.length;
    testimonials[current].classList.add('active');
    dots[current].classList.add('active');
    resetAutoplay();
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    autoplayTimer = setInterval(() => goTo(current + 1), 5500);
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));
  resetAutoplay();

  /* ---- Contact form ---- */
  const contactForm    = document.getElementById('contactForm');
  const formSuccess    = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();

      // Basic validation
      const required = contactForm.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        field.style.borderColor = '';
        if (!field.value.trim()) {
          field.style.borderColor = '#e74c3c';
          valid = false;
        }
      });

      const emailField = contactForm.querySelector('#email');
      if (emailField && emailField.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        emailField.style.borderColor = '#e74c3c';
        valid = false;
      }

      if (!valid) return;

      // Simulate submission
      const btn = contactForm.querySelector('button[type="submit"]');
      btn.textContent = 'Sending...';
      btn.disabled = true;

      setTimeout(() => {
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      }, 1200);
    });

    // Clear error highlight on input
    contactForm.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => { field.style.borderColor = ''; });
    });
  }

  /* ---- Smooth scroll for anchor links ---- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 72;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });

  /* ---- Back to top ---- */
  if (backToTop) {
    backToTop.addEventListener('click', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

});
