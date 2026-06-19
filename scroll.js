(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Word-stagger entrance (title + subtitle) ---------- */
  function splitWords(el) {
    var em = el.querySelector(".hero__title-em");
    var emHTML = em ? em.outerHTML : null;

    // Walk child nodes so we keep the <em> wrapper intact.
    var frag = document.createDocumentFragment();
    var delay = 0;

    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        node.textContent.split(/(\s+)/).forEach(function (chunk) {
          if (chunk.trim() === "") {
            frag.appendChild(document.createTextNode(chunk));
            return;
          }
          var span = document.createElement("span");
          span.className = "word";
          span.textContent = chunk;
          span.style.transitionDelay = delay + "ms";
          delay += 45;
          frag.appendChild(span);
        });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // the italic <em>SaaZCraft</em>
        var span = document.createElement("span");
        span.className = "word";
        span.appendChild(node.cloneNode(true));
        span.style.transitionDelay = delay + "ms";
        delay += 45;
        frag.appendChild(span);
      }
    });

    el.innerHTML = "";
    el.appendChild(frag);
    return el.querySelectorAll(".word");
  }

  var staggerEls = document.querySelectorAll("[data-stagger]");
  var allWords = [];
  staggerEls.forEach(function (el) {
    var words = splitWords(el);
    Array.prototype.push.apply(allWords, words);
  });

  function reveal() {
    allWords.forEach(function (w) {
      w.classList.add("is-in");
    });
    document.querySelectorAll("[data-appear]").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  if (reduceMotion) {
    reveal();
  } else {
    // next frame so the initial (hidden) state paints first
    requestAnimationFrame(function () {
      requestAnimationFrame(reveal);
    });
  }

  /* ---------- Mobile nav: hamburger toggle ---------- */
  var navEl = document.getElementById("nav");
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  if (navEl && navToggle && navMenu) {
    function navClose() {
      navEl.classList.remove("nav--open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    }
    function navOpen() {
      navEl.classList.add("nav--open");
      navToggle.setAttribute("aria-expanded", "true");
      navToggle.setAttribute("aria-label", "Close menu");
    }
    navToggle.addEventListener("click", function () {
      if (navEl.classList.contains("nav--open")) navClose();
      else navOpen();
    });
    // close after picking a destination
    navMenu.addEventListener("click", function (e) {
      if (e.target.closest("a")) navClose();
    });
    // close on Escape, and whenever we grow back to desktop width
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") navClose();
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 820) navClose();
    });
  }

  /* ---------- Scroll-driven parallax + dashboard tilt ---------- */
  var hero = document.getElementById("hero");
  var dashboard = document.querySelector(".hero__dashboard");
  var heroContent = document.querySelector(".hero__content");
  var heroStage = document.querySelector(".hero__stage");
  var heroNature = document.querySelector(".hero__nature");
  var parallaxEls = document.querySelectorAll("[data-parallax]");
  var nav = document.getElementById("nav");

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;

    // Nature drifts upward as you scroll (continuous parallax)
    parallaxEls.forEach(function (el) {
      var factor = parseFloat(el.getAttribute("data-parallax")) || 0;
      el.style.transform = "translateY(" + -(y * factor) + "px)";
    });

    // Pinned hero reveal: while the stage is pinned, the copy + background
    // scroll upward and fade out, and the dashboard zooms in where it sits;
    // then the page releases into the next section.
    if (dashboard && hero) {
      var rect = hero.getBoundingClientRect();
      var track = hero.offsetHeight - window.innerHeight; // pinned scroll length
      var p = track > 0 ? clamp(-rect.top / track, 0, 1) : 0;
      if (reduceMotion) p = 1;

      // the zoom runs across the whole pinned track and finishes right as the
      // pin releases — no hold/stop at the end
      var a = p;
      var stageH = heroStage ? heroStage.offsetHeight : window.innerHeight;
      var lift = a * (0.43 * stageH + 70); // how far the dashboard rises

      // hero copy scrolls straight up with the scroll (1:1, no fade) and slides
      // out the top of the pinned stage. The bottom fade stays put.
      var scrolled = Math.max(0, -rect.top);
      if (heroContent) {
        heroContent.style.transform = "translateY(" + (-scrolled).toFixed(1) + "px)";
      }

      // background rises with the zoom so its glow ends up centred on the
      // dashboard once it's fully visible
      if (heroNature) {
        heroNature.style.transform = "translateY(" + (-a * 0.33 * stageH).toFixed(1) + "px)";
      }

      // dashboard zooms in and lifts up so the whole screenshot ends up visible
      var ty = 70 - lift;
      var scale = 0.9 + a * 0.1; // 0.9 -> 1.0 (peek grows to full size)
      dashboard.style.transform =
        "translateX(-50%) translateY(" + ty.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
    }

    // Nav solidifies after a little scroll
    if (nav) {
      nav.classList.toggle("nav--scrolled", y > 20);
    }

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }

  window.addEventListener("scroll", requestTick, { passive: true });
  window.addEventListener("resize", requestTick);
  onScroll(); // set initial pose

  /* ---------- Content CTA: scroll-scrubbed letter reveal + card parallax ---------- */
  var ctaSection = document.querySelector(".content-cta");
  var ctaTitle = document.querySelector("[data-cta-title]");

  if (ctaSection && ctaTitle) {
    // split the headline into word > letter spans (preserving the serif
    // .title-em accent on the last words)
    var ctaLetters = [];

    function ctaAddWord(w, serif) {
      var wordEl = document.createElement("span");
      wordEl.className = serif ? "cta-word title-em" : "cta-word";
      w.split("").forEach(function (ch) {
        var letterEl = document.createElement("span");
        letterEl.className = "cta-letter";
        letterEl.textContent = ch;
        wordEl.appendChild(letterEl);
        ctaLetters.push(letterEl);
      });
      ctaTitle.appendChild(wordEl);
      ctaTitle.appendChild(document.createTextNode(" "));
    }

    var ctaNodes = Array.prototype.slice.call(ctaTitle.childNodes);
    ctaTitle.textContent = "";
    ctaNodes.forEach(function (node) {
      var serif = node.nodeType === Node.ELEMENT_NODE;
      var txt = node.textContent.replace(/\s+/g, " ").trim();
      if (!txt) return;
      txt.split(" ").forEach(function (w) {
        ctaAddWord(w, serif);
      });
    });

    // fade in the cards + button as they enter (Webflow IX2 opacity reveal)
    var fadeEls = ctaSection.querySelectorAll("[data-cta-fade]");
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
          });
        },
        { threshold: 0.25 }
      );
      fadeEls.forEach(function (el) {
        io.observe(el);
      });
    } else {
      fadeEls.forEach(function (el) {
        el.classList.add("is-in");
      });
    }

    var topImg = ctaSection.querySelector(".content-cta__card.top");
    var botImg = ctaSection.querySelector(".content-cta__card.bottom");
    var N = ctaLetters.length;
    var feather = 10; // letters fading at once — tighter front = clearer sweep
    var dim = 0.18; // un-revealed letters stay faded (legible) and fill in
    var ctaTicking = false;

    function ctaRender() {
      var rect = ctaSection.getBoundingClientRect();
      var vh = window.innerHeight;

      // Reveal scrubs as the headline rises: starts when the title's centre is
      // near the bottom of the viewport, and is fully revealed exactly when that
      // centre reaches the vertical centre of the viewport.
      var trect = ctaTitle.getBoundingClientRect();
      var titleCenter = trect.top + trect.height / 2;
      var start = vh * 0.95;
      var end = vh * 0.5;
      var p = clamp((start - titleCenter) / (start - end), 0, 1);
      if (reduceMotion) p = 1;

      var front = p * (N + feather);
      var maxBlur = 6; // px — un-revealed letters are blurred, sharpen as they light up
      for (var i = 0; i < N; i++) {
        var lit = clamp((front - i) / feather, 0, 1);
        ctaLetters[i].style.opacity = dim + (1 - dim) * lit;
        var blur = (1 - lit) * maxBlur;
        ctaLetters[i].style.filter =
          blur > 0.05 ? "blur(" + blur.toFixed(2) + "px)" : "none";
      }

      // card parallax tied to the section's offset from viewport center.
      // rel is + when the section sits above center; matches the captured
      // values (top 47.23%, bottom -22.54%) at rel ~0.945.
      if (!reduceMotion) {
        var center = rect.top + rect.height / 2;
        var rel = (vh / 2 - center) / vh;
        if (topImg) {
          topImg.style.transform = "translate3d(0," + rel * 50 + "%,0)";
        }
        if (botImg) {
          botImg.style.transform = "translate3d(0," + rel * -24 + "%,0)";
        }
      }

      ctaTicking = false;
    }

    function ctaTick() {
      if (!ctaTicking) {
        ctaTicking = true;
        requestAnimationFrame(ctaRender);
      }
    }

    window.addEventListener("scroll", ctaTick, { passive: true });
    window.addEventListener("resize", ctaTick);
    ctaRender();
  }

  /* ---------- Footer: fade-up reveal on enter ---------- */
  var footerEls = document.querySelectorAll("[data-footer-reveal]");
  if (footerEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      footerEls.forEach(function (el) {
        el.classList.add("is-in");
      });
    } else {
      var footIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              footIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      footerEls.forEach(function (el) {
        footIO.observe(el);
      });
    }
  }

  /* ---------- Pricing: Monthly/Yearly toggle ---------- */
  var pricingToggle = document.getElementById("pricing-toggle");
  var pricingCards = document.getElementById("pricing-cards");
  if (pricingToggle && pricingCards) {
    function flip() {
      var yearly = pricingCards.classList.toggle("is-yearly");
      pricingToggle.setAttribute("aria-checked", yearly ? "true" : "false");
    }
    pricingToggle.addEventListener("click", flip);
    pricingToggle.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
  }

  /* ---------- FAQ accordion (single-open: opening one closes the rest) ---------- */
  var faqItems = document.querySelectorAll(".single-faq");
  faqItems.forEach(function (item) {
    var q = item.querySelector(".faq-question");
    if (!q) return;
    q.addEventListener("click", function () {
      var willOpen = !item.classList.contains("is-open");
      // close every item first
      faqItems.forEach(function (other) {
        other.classList.remove("is-open");
        var oq = other.querySelector(".faq-question");
        if (oq) oq.setAttribute("aria-expanded", "false");
      });
      // then open the clicked one (if it was closed)
      if (willOpen) {
        item.classList.add("is-open");
        q.setAttribute("aria-expanded", "true");
      }
    });
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        q.click();
      }
    });
  });

  /* ---------- Heading letter-stagger reveal ([data-letters]) ----------
     same effect as the final-CTA heading: split into per-letter spans that
     fade + rise in with a stagger, triggered when the heading scrolls in.
     Preserves <br> line breaks and the serif .title-em accent. */
  var letterHeadings = document.querySelectorAll("[data-letters]");
  if (letterHeadings.length) {
    var splitLetters = function (el) {
      var d = { v: 0 };
      function addLetters(text, container) {
        text.split("").forEach(function (ch) {
          if (ch === " ") {
            container.appendChild(document.createTextNode(" "));
            return;
          }
          var s = document.createElement("span");
          s.className = "rv-letter";
          s.textContent = ch;
          s.style.transitionDelay = d.v + "ms";
          d.v += 22;
          container.appendChild(s);
        });
      }
      var nodes = Array.prototype.slice.call(el.childNodes);
      el.textContent = "";
      nodes.forEach(function (node) {
        if (node.nodeName === "BR") {
          el.appendChild(document.createElement("br"));
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          var wrap = document.createElement("span");
          wrap.className = node.className; // keep .title-em etc.
          addLetters(node.textContent.replace(/\s+/g, " ").trim(), wrap);
          el.appendChild(wrap);
        } else {
          var txt = node.textContent.replace(/\s+/g, " ");
          if (txt.trim() === "") return;
          addLetters(txt, el);
        }
      });
    };

    var fireLetters = function (el) {
      el.querySelectorAll(".rv-letter").forEach(function (l) {
        l.classList.add("is-in");
      });
    };

    letterHeadings.forEach(splitLetters);

    if (reduceMotion || !("IntersectionObserver" in window)) {
      letterHeadings.forEach(fireLetters);
    } else {
      var letterIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              fireLetters(e.target);
              letterIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.25 }
      );
      letterHeadings.forEach(function (el) {
        letterIO.observe(el);
      });
    }
  }

  /* ---------- Per-section fade + blur reveal ([data-section-reveal]) ---------- */
  var sectionReveals = document.querySelectorAll("[data-section-reveal]");
  if (sectionReveals.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      sectionReveals.forEach(function (el) {
        el.classList.add("is-revealed");
      });
    } else {
      var secIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            // Sections flagged [data-section-reveal-repeat] replay their
            // entrance every time they re-enter the viewport (reset on exit);
            // all others reveal once and are then unobserved.
            if (e.target.hasAttribute("data-section-reveal-repeat")) {
              e.target.classList.toggle("is-revealed", e.isIntersecting);
            } else if (e.isIntersecting) {
              e.target.classList.add("is-revealed");
              secIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12 }
      );
      sectionReveals.forEach(function (el) {
        secIO.observe(el);
      });
    }
  }

  /* ---------- Generic entrance reveal ([data-reveal]) ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) {
        el.classList.add("is-in");
      });
    } else {
      var revIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              revIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealEls.forEach(function (el) {
        revIO.observe(el);
      });
    }
  }

  /* ---------- Collaborate section: sticky left, scrolling image timeline ----
     The left column is anchored (CSS sticky). The right column is a natural
     vertical scroll of image blocks; whichever block is crossing the viewport
     centre sets the active point on the left. No stack transform — native
     scroll does all the movement. */
  var collabSection = document.querySelector(".collab");
  var collabItems = document.querySelectorAll(".collab__item");
  if (collabSection && collabItems.length) {
    var collabOpen = -1;
    var collabFill = collabSection.querySelector(".collab__progress-fill");
    var collabBlocks = collabSection.querySelectorAll(".collab__block");

    function collabSetActive(idx) {
      if (idx === collabOpen) return;
      collabOpen = idx;
      collabItems.forEach(function (item, i) {
        var open = i === idx;
        item.classList.toggle("is-open", open);
        var h = item.querySelector(".collab__head");
        if (h) h.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    // click a point → smooth-scroll its image to the viewport centre
    collabItems.forEach(function (item, i) {
      var head = item.querySelector(".collab__head");
      if (!head) return;
      head.addEventListener("click", function () {
        var block = collabBlocks[i];
        if (!block) return;
        var rect = block.getBoundingClientRect();
        var target =
          window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
        target = Math.round(target);
        if (window.lenis) {
          window.lenis.scrollTo(target, { duration: 1 });
        } else {
          window.scrollTo({ top: target, behavior: "smooth" });
        }
      });
    });

    // active point = the image block currently crossing the viewport centre
    if ("IntersectionObserver" in window) {
      var centreIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              collabSetActive(+e.target.getAttribute("data-collab-index"));
            }
          });
        },
        // shrink the root to a 1px line at the vertical centre of the viewport
        { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
      );
      collabBlocks.forEach(function (b) {
        centreIO.observe(b);
      });
    } else {
      collabSetActive(0);
    }

    // progress rail + scroll-linked slide: each editor enters from the right
    // (translateX → 0) as it rises toward the viewport centre
    function collabProgress() {
      var vh = window.innerHeight;
      var desktop = window.innerWidth > 860;

      collabBlocks.forEach(function (b, i) {
        if (!desktop) {
          b.style.transform = "";
          b.style.opacity = "";
          b.style.filter = "";
          return;
        }
        var r = b.getBoundingClientRect();
        var d = (r.top + r.height / 2 - vh / 2) / vh; // >0 = below centre (entering)
        var t = clamp(d / 0.55, 0, 1); // 0 at centre, 1 when well below
        b.style.transform = "translateX(" + (t * 130).toFixed(1) + "px)";
        b.style.opacity = (1 - t * 0.35).toFixed(3);
        // blur only at the very start of the entrance (when it first appears
        // at the bottom); it's already sharp for the rest of the slide
        var bt = clamp((t - 0.65) / 0.35, 0, 1);
        b.style.filter = bt > 0.01 ? "blur(" + (bt * 10).toFixed(2) + "px)" : "none";
      });

      if (collabFill) {
        var track = collabSection.offsetHeight - vh;
        collabFill.style.height =
          (track <= 0
            ? 0
            : clamp(-collabSection.getBoundingClientRect().top / track, 0, 1) *
              100) + "%";
      }
    }
    // rAF-throttle so the layout reads + style writes run at most once per
    // frame instead of on every (lenis-driven) scroll event
    var collabTicking = false;
    function collabTick() {
      if (!collabTicking) {
        collabTicking = true;
        requestAnimationFrame(function () {
          collabProgress();
          collabTicking = false;
        });
      }
    }
    window.addEventListener("scroll", collabTick, { passive: true });
    window.addEventListener("resize", collabTick);
    collabProgress();
  }

  /* ---------- Dark nav over dark sections ---------- */
  var nav = document.getElementById("nav");
  var darkSections = document.querySelectorAll(".collab, .process");
  if (nav && darkSections.length) {
    function navTheme() {
      // probe a point inside the nav bar (~half its height)
      var probe = nav.offsetHeight * 0.5;
      var navH = nav.offsetHeight;
      var ramp = 70; // px over which the dark fade ramps in/out
      var dark = false;
      var fadeH = 150; // default fade height
      var op = 0; // dark fade opacity
      darkSections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) dark = true;
        // dark fade opacity: ramps in as the section top rises under the nav,
        // and ramps out as the section bottom reaches the nav bottom (the
        // dark/light boundary) — so it disappears exactly at that seam
        var fadeIn = clamp((navH - r.top) / ramp, 0, 1);
        var fadeOut = clamp((r.bottom - navH) / ramp, 0, 1);
        op = Math.max(op, Math.min(fadeIn, fadeOut));
        // clip the fade height to the section bottom so it never spills onto
        // the light section below
        if (r.bottom >= 0 && r.bottom < 150) {
          fadeH = Math.min(fadeH, r.bottom);
        }
      });
      nav.classList.toggle("nav--dark", dark);
      nav.style.setProperty("--nav-fade-h", fadeH + "px");
      nav.style.setProperty("--nav-fade-op", op.toFixed(3));
    }
    // rAF-throttle the dark-nav probe (reads layout for every dark section)
    var navThemeTicking = false;
    function navThemeTick() {
      if (!navThemeTicking) {
        navThemeTicking = true;
        requestAnimationFrame(function () {
          navTheme();
          navThemeTicking = false;
        });
      }
    }
    window.addEventListener("scroll", navThemeTick, { passive: true });
    window.addEventListener("resize", navThemeTick);
    navTheme();
  }

  /* ---------- Final CTA: letter stagger, fade-ups, scroll scale ---------- */
  var finalCta = document.querySelector(".cta-final");
  if (finalCta) {
    // split [data-cta-letters] into staggered letter spans, keeping the serif
    // .title-em accent on the last words
    document.querySelectorAll("[data-cta-letters]").forEach(function (el) {
      var nodes = Array.prototype.slice.call(el.childNodes);
      el.textContent = "";
      var d = { v: 0 };

      function addLetters(text, container) {
        text.split("").forEach(function (ch) {
          if (ch === " ") {
            container.appendChild(document.createTextNode(" "));
            return;
          }
          var s = document.createElement("span");
          s.className = "rv-letter";
          s.textContent = ch;
          s.style.transitionDelay = d.v + "ms";
          d.v += 22;
          container.appendChild(s);
        });
      }

      nodes.forEach(function (node) {
        var txt = node.textContent.replace(/\s+/g, " ").trim();
        if (!txt) return;
        if (node.nodeType === Node.ELEMENT_NODE) {
          var serif = document.createElement("span");
          serif.className = "title-em";
          addLetters(txt, serif);
          el.appendChild(serif);
        } else {
          addLetters(txt, el);
          el.appendChild(document.createTextNode(" "));
        }
      });
    });

    // entrance reveals (letters + fades) when each group enters
    var revealTargets = [];
    finalCta
      .querySelectorAll("[data-cta-group], [data-cta-fade]")
      .forEach(function (el) {
        revealTargets.push(el);
      });

    function fireReveal(el) {
      el.classList.add("is-in");
      el.querySelectorAll(".rv-letter").forEach(function (l) {
        l.classList.add("is-in");
      });
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach(fireReveal);
    } else {
      var ctaIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              fireReveal(e.target);
              ctaIO.unobserve(e.target);
            }
          });
        },
        { threshold: 0.3 }
      );
      revealTargets.forEach(function (el) {
        ctaIO.observe(el);
      });
    }

    // scroll-scrubbed scale on the framed image (0.8 -> 1), matching IX2
    var scaleWrap = finalCta.querySelector("[data-cta-scale]");
    if (scaleWrap && !reduceMotion) {
      var scTicking = false;

      function scaleRender() {
        var rect = scaleWrap.getBoundingClientRect();
        var vh = window.innerHeight;
        // 0 as it enters from the bottom, 1 once it has risen ~60% of viewport
        var p = clamp((vh - rect.top) / (vh * 0.6), 0, 1);
        scaleWrap.style.transform = "scale(" + (0.8 + 0.2 * p) + ")";
        scTicking = false;
      }
      function scaleTick() {
        if (!scTicking) {
          scTicking = true;
          requestAnimationFrame(scaleRender);
        }
      }
      window.addEventListener("scroll", scaleTick, { passive: true });
      window.addEventListener("resize", scaleTick);
      scaleRender();
    }
  }

  /* ---------- Process: tabbed step card (auto-advances, click to jump) ---------- */
  var proc = document.getElementById("process");
  if (proc) {
    var procTabs = proc.querySelectorAll(".process__tab");
    var procPanels = proc.querySelectorAll(".process__panel");
    var procCopies = proc.querySelectorAll(".process__copy");
    var STEPS = procPanels.length; // 4
    var procActive = 0;
    var procTimer = null;
    var AUTO_MS = 4000;

    function procShow(idx) {
      procActive = (idx + STEPS) % STEPS;
      procTabs.forEach(function (tab, i) {
        var on = i === procActive;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });
      procPanels.forEach(function (panel, i) {
        panel.classList.toggle("is-active", i === procActive);
      });
      procCopies.forEach(function (copy, i) {
        copy.classList.toggle("is-active", i === procActive);
      });
    }

    function procStart() {
      if (reduceMotion || procTimer) return;
      procTimer = setInterval(function () {
        procShow(procActive + 1);
      }, AUTO_MS);
    }

    function procStop() {
      if (procTimer) {
        clearInterval(procTimer);
        procTimer = null;
      }
    }

    procTabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        procStop();
        procShow(parseInt(tab.getAttribute("data-tab"), 10));
        procStart();
      });
    });

    // pause the auto-advance while the user is hovering the card
    proc.addEventListener("mouseenter", procStop);
    proc.addEventListener("mouseleave", procStart);

    // only run the auto-advance while the section is on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) procStart();
            else procStop();
          });
        },
        { threshold: 0.25 }
      ).observe(proc);
    } else {
      procStart();
    }

    procShow(0);
  }

  /* ---------- Bottlenecks: sticky stage with drifting alert cards ---------- */
  var bottle = document.getElementById("bottlenecks");
  if (bottle) {
    // split the headline into word spans (preserving the <br>) for a rise-in reveal
    var bTitle = bottle.querySelector("[data-words]");
    if (bTitle) {
      var bFrag = document.createDocumentFragment();
      var bDelay = 0;
      Array.prototype.forEach.call(bTitle.childNodes, function (node) {
        if (node.nodeType === Node.TEXT_NODE) {
          node.textContent.split(/(\s+)/).forEach(function (chunk) {
            if (chunk.trim() === "") {
              bFrag.appendChild(document.createTextNode(chunk));
              return;
            }
            var word = document.createElement("span");
            word.className = "b-word";
            var inner = document.createElement("span");
            inner.className = "b-word__i";
            inner.textContent = chunk;
            inner.style.transitionDelay = bDelay + "ms";
            bDelay += 65;
            word.appendChild(inner);
            bFrag.appendChild(word);
          });
        } else if (node.nodeName === "BR") {
          bFrag.appendChild(node.cloneNode());
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // serif accent (.title-em) — animate the whole phrase as one word
          var word = document.createElement("span");
          word.className = "b-word";
          var inner = document.createElement("span");
          inner.className = "b-word__i";
          inner.appendChild(node.cloneNode(true));
          inner.style.transitionDelay = bDelay + "ms";
          bDelay += 65;
          word.appendChild(inner);
          bFrag.appendChild(word);
        }
      });
      bTitle.innerHTML = "";
      bTitle.appendChild(bFrag);

      if (reduceMotion || !("IntersectionObserver" in window)) {
        bTitle.classList.add("is-in");
      } else {
        var bIO = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting) {
                bTitle.classList.add("is-in");
                bIO.unobserve(e.target);
              }
            });
          },
          { threshold: 0.2 }
        );
        bIO.observe(bTitle);
      }
    }

    // once the section is 60% scrolled into view, the four cards cascade in
    // one-by-one (the stagger comes from per-card CSS transition-delays)
    var bCards = bottle.querySelectorAll(".stat-card");
    var REVEAL_AT = 0.4; // entry progress at which the cascade fires
    var bTicking = false;

    function bRender() {
      var rect = bottle.getBoundingClientRect();
      var vh = window.innerHeight;
      // entry progress: 0 when the section's top hits the bottom of the screen,
      // 1 when its top reaches the top of the screen
      var entry = clamp((vh - rect.top) / vh, 0, 1);

      if (reduceMotion || entry >= REVEAL_AT) {
        bCards.forEach(function (card) {
          card.classList.add("is-revealed");
        });
      }
      bTicking = false;
    }

    function bTick() {
      if (!bTicking) {
        bTicking = true;
        requestAnimationFrame(bRender);
      }
    }

    window.addEventListener("scroll", bTick, { passive: true });
    window.addEventListener("resize", bTick);
    bRender();
  }
})();
