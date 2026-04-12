/* ═══════════════════════════════════════════════════
   KM Wedding Page — main.js
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─── 1. NAVBAR ─── */

  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('nav-links');
  const allLinks  = navLinks.querySelectorAll('a');

  // Shadow on scroll
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.querySelector('i').className = open
      ? 'fa-solid fa-xmark'
      : 'fa-solid fa-bars';
  });

  // Close mobile menu when a link is clicked
  allLinks.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.querySelector('i').className = 'fa-solid fa-bars';
    });
  });

  // Active link via IntersectionObserver
  const sections = document.querySelectorAll('section[id]');

  const observerOpts = {
    rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64}px 0px -55% 0px`,
    threshold: 0,
  };

  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      allLinks.forEach(link => {
        const isActive = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', isActive);
        if (isActive) link.setAttribute('aria-current', 'page');
        else           link.removeAttribute('aria-current');
      });
    });
  }, observerOpts);

  sections.forEach(s => sectionObserver.observe(s));


  /* ─── 2. COUNTDOWN ─── */

  // *** Změňte datum a čas vaší svatby ***
  const WEDDING_DATE = new Date('2026-06-13T15:00:00');

  const cdDays    = document.getElementById('cd-days');
  const cdHours   = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');

  function setWithPulse(el, newVal) {
    const str = String(newVal).padStart(2, '0');
    if (el.textContent === str) return;
    el.textContent = str;
    el.classList.remove('pulse');
    // Force reflow so animation restarts
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 300);
  }

  function updateCountdown() {
    const diff = WEDDING_DATE - Date.now();
    if (diff <= 0) {
      [cdDays, cdHours, cdMinutes, cdSeconds].forEach(el => { el.textContent = '00'; });
      return;
    }
    setWithPulse(cdDays,    Math.floor(diff / 86_400_000));
    setWithPulse(cdHours,   Math.floor((diff % 86_400_000) / 3_600_000));
    setWithPulse(cdMinutes, Math.floor((diff % 3_600_000)  / 60_000));
    setWithPulse(cdSeconds, Math.floor((diff % 60_000)     / 1_000));
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);


  /* ─── 3. LIVE PHOTOS ─── */

  document.querySelectorAll('.live-photo').forEach(figure => {
    const video = figure.querySelector('video');
    if (!video) return;

    figure.addEventListener('mouseenter', () => {
      figure.classList.add('playing');
      video.play().catch(() => {}); // ignore autoplay errors
    });

    figure.addEventListener('mouseleave', () => {
      figure.classList.remove('playing');
      video.pause();
      video.currentTime = 0;
    });

    // Touch: tap once to play, tap again to open lightbox
    let liveTouch = false;
    figure.addEventListener('touchstart', e => {
      if (!liveTouch) {
        e.preventDefault();
        liveTouch = true;
        figure.classList.add('playing');
        video.play().catch(() => {});
        setTimeout(() => {
          liveTouch = false;
          figure.classList.remove('playing');
          video.pause();
          video.currentTime = 0;
        }, 3000);
      }
    }, { passive: false });
  });


  /* ─── 4. GALLERY LIGHTBOX ─── */

  const lightbox     = document.getElementById('lightbox');
  const lightboxImg  = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  let galleryFigures = [];
  let currentIndex   = 0;

  function buildGalleryIndex() {
    // Only real <figure> elements (not placeholders)
    galleryFigures = Array.from(
      document.querySelectorAll('#gallery-grid figure')
    );
  }

  function openLightbox(index) {
    if (!galleryFigures.length) return;
    currentIndex = index;
    const fig = galleryFigures[currentIndex];
    const img = fig.querySelector('img');
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || '';
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
    updateNavButtons();
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    // Return focus to the figure that opened the lightbox
    if (galleryFigures[currentIndex]) galleryFigures[currentIndex].focus();
  }

  function showPrev() {
    if (!galleryFigures.length) return;
    currentIndex = (currentIndex - 1 + galleryFigures.length) % galleryFigures.length;
    openLightbox(currentIndex);
  }

  function showNext() {
    if (!galleryFigures.length) return;
    currentIndex = (currentIndex + 1) % galleryFigures.length;
    openLightbox(currentIndex);
  }

  function updateNavButtons() {
    const single = galleryFigures.length <= 1;
    lightboxPrev.style.display = single ? 'none' : '';
    lightboxNext.style.display = single ? 'none' : '';
  }

  buildGalleryIndex();

  // Click on gallery figures
  document.getElementById('gallery-grid').addEventListener('click', e => {
    const fig = e.target.closest('figure');
    if (!fig) return;
    const idx = galleryFigures.indexOf(fig);
    if (idx !== -1) openLightbox(idx);
  });

  // Keyboard: Enter/Space on focused figure
  document.getElementById('gallery-grid').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const fig = e.target.closest('figure');
    if (!fig) return;
    e.preventDefault();
    const idx = galleryFigures.indexOf(fig);
    if (idx !== -1) openLightbox(idx);
  });

  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrev);
  lightboxNext.addEventListener('click', showNext);

  // Click outside image closes lightbox
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation in lightbox
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')      closeLightbox();
    else if (e.key === 'ArrowLeft')  showPrev();
    else if (e.key === 'ArrowRight') showNext();
  });

  // Touch/swipe support in lightbox
  let touchStartX = null;
  lightbox.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) dx < 0 ? showNext() : showPrev();
    touchStartX = null;
  }, { passive: true });


  /* ─── 4. RSVP FORM ─── */

  const rsvpForm      = document.getElementById('rsvp-form');
  const rsvpSuccess   = document.getElementById('rsvp-success');
  const rsvpError     = document.getElementById('rsvp-error');
  const rsvpSubmit    = document.getElementById('rsvp-submit');
  const rsvpSubtitle  = document.getElementById('rsvp-subtitle');
  const rsvpAnother   = document.getElementById('rsvp-another');
  const guestGroup    = document.getElementById('guest-count-group');
  const emailInput    = document.getElementById('rsvp-email');
  const replyToHidden = document.getElementById('rsvp-replyto');

  // Sync hidden _replyto with email field
  emailInput.addEventListener('input', () => {
    replyToHidden.value = emailInput.value;
  });

  // Show/hide guest count based on attendance
  document.querySelectorAll('input[name="attendance"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const attending = document.getElementById('att-yes').checked;
      guestGroup.classList.toggle('visible', attending);
      document.getElementById('rsvp-guests').required = attending;
    });
  });

  if (!rsvpForm) return;

  rsvpAnother.addEventListener('click', () => {
    rsvpSuccess.hidden = true;
    rsvpSubtitle.hidden = false;
    rsvpSubmit.disabled = false;
    rsvpSubmit.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Odeslat potvrzení';
    rsvpForm.hidden = false;
    rsvpForm.querySelector('#rsvp-name').focus();
  });

  rsvpForm.addEventListener('submit', async e => {
    e.preventDefault();

    // Basic client-side validation
    if (!rsvpForm.checkValidity()) {
      rsvpForm.reportValidity();
      return;
    }

    // Check Formspree ID is set
    const action = rsvpForm.action;
    if (action.includes('YOUR_FORM_ID')) {
      alert('Nastavení: Nahraďte YOUR_FORM_ID vaším Formspree ID v index.html.\n\nSetup: Replace YOUR_FORM_ID with your Formspree form ID in index.html.');
      return;
    }

    rsvpSubmit.disabled = true;
    rsvpSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Odesílám…';

    const data = new FormData(rsvpForm);

    try {
      const res = await fetch(action, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        rsvpForm.reset();
        guestGroup.classList.remove('visible');
        rsvpForm.hidden = true;
        rsvpSubtitle.hidden = true;
        rsvpSuccess.hidden = false;
        rsvpSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        throw new Error(`Status ${res.status}`);
      }
    } catch {
      rsvpError.hidden = false;
      rsvpError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      rsvpSubmit.disabled = false;
      rsvpSubmit.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Odeslat potvrzení';
    }
  });

});
