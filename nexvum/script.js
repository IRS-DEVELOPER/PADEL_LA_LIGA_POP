'use strict';

/* ─────────────────────────────────────────────
   Navbar — sticky + mobile toggle
───────────────────────────────────────────── */
function initNavbar() {
  const navbar   = document.getElementById('navbar');
  const toggle   = document.getElementById('navToggle');
  const menu     = document.getElementById('navMenu');
  const links    = menu.querySelectorAll('a');

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 80);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', () => {
    const open = toggle.classList.toggle('open');
    menu.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  const closeMenu = () => {
    toggle.classList.remove('open');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  };

  links.forEach(link => link.addEventListener('click', closeMenu));
}

/* ─────────────────────────────────────────────
   Smooth scroll for in-page anchors
───────────────────────────────────────────── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = document.getElementById('navbar').offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ─────────────────────────────────────────────
   Scroll reveal (IntersectionObserver)
───────────────────────────────────────────── */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay * i);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  // Stagger siblings inside a grid
  document.querySelectorAll('.services__grid, .portfolio__grid, .about__stats').forEach(grid => {
    grid.querySelectorAll('.reveal').forEach((el, i) => {
      el.dataset.delay = 100;
    });
  });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────
   Animated number counters
───────────────────────────────────────────── */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('.stat__number[data-target]');
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        animateCounter(el, parseInt(el.dataset.target, 10));
        observer.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );
  counters.forEach(c => observer.observe(c));
}

/* ─────────────────────────────────────────────
   Portfolio filter
───────────────────────────────────────────── */
function initPortfolioFilter() {
  const btns  = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.project-card');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;
      cards.forEach(card => {
        const match = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('hidden', !match);
      });
    });
  });
}

/* ─────────────────────────────────────────────
   Contact form validation
───────────────────────────────────────────── */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  const submit  = document.getElementById('submitBtn');

  if (!form) return;

  const fields = {
    nombre:  { el: document.getElementById('nombre'),  err: document.getElementById('errorNombre') },
    email:   { el: document.getElementById('email'),   err: document.getElementById('errorEmail')  },
    mensaje: { el: document.getElementById('mensaje'), err: document.getElementById('errorMensaje') },
  };

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate() {
    let ok = true;

    const n = fields.nombre.el.value.trim();
    if (!n) {
      fields.nombre.err.textContent = 'Por favor ingresa tu nombre.';
      fields.nombre.el.classList.add('error');
      ok = false;
    } else {
      fields.nombre.err.textContent = '';
      fields.nombre.el.classList.remove('error');
    }

    const e = fields.email.el.value.trim();
    if (!e || !emailRe.test(e)) {
      fields.email.err.textContent = 'Ingresa un correo electrónico válido.';
      fields.email.el.classList.add('error');
      ok = false;
    } else {
      fields.email.err.textContent = '';
      fields.email.el.classList.remove('error');
    }

    const m = fields.mensaje.el.value.trim();
    if (!m) {
      fields.mensaje.err.textContent = 'Por favor escribe tu mensaje.';
      fields.mensaje.el.classList.add('error');
      ok = false;
    } else {
      fields.mensaje.err.textContent = '';
      fields.mensaje.el.classList.remove('error');
    }

    return ok;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validate()) return;

    submit.disabled = true;
    submit.querySelector('.btn__text').textContent = 'Enviando…';

    // Simulate async send (replace with real fetch to backend)
    setTimeout(() => {
      form.reset();
      submit.disabled = false;
      submit.querySelector('.btn__text').textContent = 'Enviar Mensaje';
      success.classList.add('show');
      setTimeout(() => success.classList.remove('show'), 6000);
    }, 1200);
  });
}

/* ─────────────────────────────────────────────
   Footer year
───────────────────────────────────────────── */
function initYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ─────────────────────────────────────────────
   Boot
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSmoothScroll();
  initScrollReveal();
  initCounters();
  initPortfolioFilter();
  initContactForm();
  initYear();
});
