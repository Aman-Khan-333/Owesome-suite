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

  /* ---------- Scroll-driven parallax + dashboard tilt ---------- */
  var hero = document.getElementById("hero");
  var dashboard = document.querySelector(".hero__dashboard");
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

    // Dashboard stand-up — scrubbed by progress through the hero's pinned track.
    // The .hero is a tall track; .hero__stage is sticky, so the viewport holds
    // in place while the dashboard rotates from tilted-back to facing the user.
    if (dashboard && hero) {
      var rect = hero.getBoundingClientRect();
      var track = hero.offsetHeight - window.innerHeight;
      var p = track > 0 ? clamp(-rect.top / track, 0, 1) : 0;
      if (reduceMotion) p = 1;

      // finish standing up over the first ~70% of the track, then hold.
      // Pivot is the top edge (CSS transform-origin), so the dashboard's top
      // stays parked at ~57% while it rotates upright — no drift into the copy.
      var a = clamp(p / 0.7, 0, 1);
      var rot = 34 * (1 - a); // 34deg tilted back -> 0deg facing the user
      var ty = 40 * (1 - a); // small settle: starts 40px lower, lands on the line
      dashboard.style.transform =
        "translateX(-50%) perspective(1300px) translateY(" +
        ty.toFixed(1) +
        "px) rotateX(" +
        rot.toFixed(2) +
        "deg)";
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

  /* ---------- FAQ accordion ---------- */
  var faqItems = document.querySelectorAll(".single-faq");
  faqItems.forEach(function (item) {
    var q = item.querySelector(".faq-question");
    if (!q) return;
    q.addEventListener("click", function () {
      var open = item.classList.toggle("is-open");
      q.setAttribute("aria-expanded", open ? "true" : "false");
    });
    q.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        q.click();
      }
    });
  });

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
            if (e.isIntersecting) {
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
    window.addEventListener("scroll", collabProgress, { passive: true });
    window.addEventListener("resize", collabProgress);
    collabProgress();
  }

  /* ---------- Dark nav over dark sections ---------- */
  var nav = document.getElementById("nav");
  var darkSections = document.querySelectorAll(".collab, .process");
  if (nav && darkSections.length) {
    function navTheme() {
      // probe a point inside the nav bar (~half its height)
      var probe = nav.offsetHeight * 0.5;
      var dark = false;
      darkSections.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.top <= probe && r.bottom >= probe) dark = true;
      });
      nav.classList.toggle("nav--dark", dark);
    }
    window.addEventListener("scroll", navTheme, { passive: true });
    window.addEventListener("resize", navTheme);
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

  /* ---------- Process: scroll-scrubbed rotating dial + step carousel ---------- */
  var proc = document.getElementById("process");
  if (proc) {
    var procOrbit = proc.querySelector(".process__orbit");
    var procSteps = proc.querySelectorAll(".process__step");
    var procIcons = proc.querySelectorAll(".process__icon");
    var STEPS = procSteps.length; // 4
    var GAP = 200; // px each step slides through (matches the CSS resting offset)
    var procTicking = false;
    var lastActive = -1;

    function procRender() {
      var rect = proc.getBoundingClientRect();
      var vh = window.innerHeight;
      // progress across the sticky track: 0 when the section pins, 1 at the end
      var track = rect.height - vh;
      var p = track > 0 ? clamp(-rect.top / track, 0, 1) : 0;
      if (reduceMotion) p = 0;

      // continuous position along the 4 steps (0 .. STEPS-1)
      var pos = p * (STEPS - 1);
      var active = Math.round(pos);

      // dial spins 90deg per step so the active icon swings to the top
      procOrbit.style.setProperty("--spin", -pos * 90 + "deg");

      // each icon is fully visible/sharp at the top (apex) and fades + blurs
      // to nothing toward the bottom of the orbit (its start/end positions)
      procIcons.forEach(function (icon) {
        var idx = parseInt(icon.getAttribute("data-icon"), 10);
        var ang = ((idx - pos) * 90) % 360; // degrees from the top
        if (ang > 180) ang -= 360;
        if (ang < -180) ang += 360;
        var frac = Math.abs(ang) / 180; // 0 = top, 1 = bottom
        // crisp at the top, then ramps to heavy blur and reaches opacity 0
        // by ~72deg from the top (well before the sides)
        var f = frac / 0.4;
        icon.style.opacity = clamp(1 - f * f, 0, 1).toFixed(3);
        icon.style.filter =
          frac > 0.02 ? "blur(" + (frac * frac * 80).toFixed(2) + "px)" : "none";
      });

      // step copy: active one centred, others slid out (above if passed, below if upcoming)
      procSteps.forEach(function (step, i) {
        var delta = i - pos;
        var offset = delta * GAP;
        var op = clamp(1 - Math.abs(delta) * 1.4, 0, 1);
        step.style.transform =
          "translate(-50%, " + offset + "px)";
        step.style.opacity = op;
        step.classList.toggle("is-active", i === active);
      });

      if (active !== lastActive) {
        procIcons.forEach(function (icon) {
          icon.classList.toggle(
            "is-active",
            parseInt(icon.getAttribute("data-icon"), 10) === active
          );
        });
        lastActive = active;
      }

      procTicking = false;
    }

    function procTick() {
      if (!procTicking) {
        procTicking = true;
        requestAnimationFrame(procRender);
      }
    }

    window.addEventListener("scroll", procTick, { passive: true });
    window.addEventListener("resize", procTick);
    procRender();
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

    // cards reveal one-by-one (each with a glitch entrance) as the stage is pinned,
    // plus a gentle scroll-scrubbed vertical drift.
    var bCards = bottle.querySelectorAll(".alert-card");
    // scroll-progress point at which each card pops in (in DOM order)
    var REVEAL_AT = [0.12, 0.34, 0.56, 0.76];
    var bTicking = false;

    function bRender() {
      var rect = bottle.getBoundingClientRect();
      var vh = window.innerHeight;
      var track = rect.height - vh; // length of the pinned scroll
      var p = track > 0 ? clamp(-rect.top / track, 0, 1) : 0;

      // p: 0 (entering) -> 1 (leaving). Map to -1..1 so cards pass through centre.
      var t = (0.5 - p) * 2;
      bCards.forEach(function (card, i) {
        var drift = parseFloat(card.getAttribute("data-drift")) || 0.5;
        var ty = t * 90 * drift;
        // set as a variable so CSS can compose it with any centring translateX
        card.style.setProperty("--drift-y", ty.toFixed(2) + "px");

        // toggle reveal — removing the class resets the glitch so it re-plays on re-entry
        var at = REVEAL_AT[i] != null ? REVEAL_AT[i] : 0.5;
        var on = reduceMotion ? true : p >= at;
        card.classList.toggle("is-revealed", on);
      });
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
