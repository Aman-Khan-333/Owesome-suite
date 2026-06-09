# Owesome Suit — Landing Page

A modern, animated SaaS landing page. Static site (plain HTML/CSS/JS), no build step.

## Highlights

- **Hero** with a scroll-driven dashboard "stand-up" and parallax, fading into the page at the bottom.
- **Bottlenecks** sticky stage with drifting alert cards.
- **Content CTA** with a scroll-scrubbed letter reveal.
- **Process** — a rotating dial whose icons resolve sharp at the apex and blur/fade away as they swing down.
- **Create, collaborate, and go live** — a sticky-left feature list synced to a scrolling timeline of Framer-style editor mockups that slide in (and blur in) from the right.
- **Pricing**, **FAQ**, and final CTA.
- Site-wide smooth (eased) scrolling via [Lenis](https://github.com/darkroomengineering/lenis), respecting `prefers-reduced-motion`.
- Dark navbar over dark sections.

## Project structure

```
index.html      # markup for every section
styles.css      # all styles (design tokens at the top)
scroll.js       # scroll-driven animations & interactions
media/          # local images used by the page
vercel.json     # static hosting config (clean URLs)
```

## Run locally

It's a static site — serve the folder with any static server:

```bash
npx serve .
# then open the printed URL (e.g. http://localhost:3000)
```

## Deploy (Vercel)

No build is required. Import the repo in Vercel (or run `vercel`) and deploy —
the framework preset is **Other / Static**; output is the repo root.

## Notes

Some imagery is loaded from Framer's CDN over HTTPS; the locally bundled images
live in `media/`.
