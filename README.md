Live Site: https://www.waffbell.com

---

# WaffBell Portfolio — Engineering-Oriented Static Site

This repository contains the source code of my personal portfolio website,  
published via **GitHub Pages + custom domain**.

The purpose of this repository is **not** to showcase visual design alone, but to
demonstrate **engineering decisions, structure, and maintainability** behind a
static web product.

The live website represents the *result*.  
This repository explains the *how* and *why*.

---

## Purpose of This Repository

- Provide a **technical explanation** of how the portfolio site is built
- Demonstrate:
  - Frontend architecture decisions
  - State management without frameworks
  - Theme / animation separation and extensibility
- Act as a **supplemental artifact** for engineering evaluation  
  (recruitment, freelance proposals, technical review)

> Visual appearance should be evaluated via the live site.  
> This README focuses on implementation quality and design intent.

---

## Why a Pure Static Site

### Design Intent
- No build step, no framework, no runtime dependencies
- Focus on **deterministic behavior**, clarity, and deploy simplicity
- Avoid overengineering for a content-driven site

### Benefits
- Extremely low deployment and hosting cost
- Easy to audit and reason about
- Zero framework lock-in
- Clear separation of concerns (structure / behavior / presentation)

---

## Key Features (Engineering Perspective)

### Theme System (Dark / Light)
- Controlled via `data-theme` on `documentElement`
- Theme state persisted in `localStorage`
- Implemented with **CSS Variables**, not JS styling
- Default theme is **Dark**
- Initial theme is resolved **before first paint** to avoid FOUC

Relevant files:
- `css/themes/theme-dark.css`
- `css/themes/theme-light.css`
- `js/main.js`

---

### Opening Animation (Canvas)
- Canvas-based particle animation for the opening section
- Color and tone are injected via CSS Variables
- Animation logic is isolated from theme logic
- Respects `prefers-reduced-motion`

Design principle:
> JS controls *behavior*, CSS controls *appearance*

---

### Background Effects
- Decorative background animations (particles / constellation-like effects)
- Implemented as progressive enhancement
- Gracefully degraded on low-motion environments

---

### Simple i18n Strategy
- `index.html` (Japanese)
- `index.en.html` (English)
- No runtime language switching to keep state and routing simple
- Explicit pages reduce hidden complexity

---

## Directory Structure
```
/
├─ index.html            # Japanese
├─ index.en.html         # English
├─ css/
│  ├─ main.css
│  ├─ base/
│  │  └─ tokens.css      # Design tokens (colors, spacing, sizing)
│  ├─ themes/
│  │  ├─ theme-dark.css
│  │  └─ theme-light.css
│  ├─ layout/            # Header / Footer / layout-level styles
│  └─ components/        # Section and component styles
├─ js/
│  └─ main.js            # Theme, animation, UI behavior
└─ img/
```

---

## Local Development

No build process is required.

For reliable behavior (relative paths, animation timing), a local server is recommended.

```bash
cd portfolio
python3 -m http.server 8000
```

Open: http://localhost:8000

---

## Customization Guide

### Changing Colors or Tone
1. Adjust shared tokens in:
   - `css/base/tokens.css`
2. Apply theme-specific overrides in:
   - `css/themes/theme-dark.css`
   - `css/themes/theme-light.css`

### Layout Adjustments
- Header / navigation: `css/layout/`
- Responsive behavior is handled via explicit media queries

---

## Deployment

This site is intended to be deployed as a static asset bundle.

Confirmed compatible with:
- GitHub Pages
- Netlify
- Cloudflare Pages

---

## License / Notes
- Code and design are authored by the repository owner
- Third-party assets (fonts, images) should follow their respective licenses if added

---

## Closing Note

This repository is intentionally minimal in tooling,  
but explicit in structure and intent.

It reflects how I approach frontend work as an engineer:
- predictable behavior
- controlled complexity
- long-term maintainability over short-term convenience
