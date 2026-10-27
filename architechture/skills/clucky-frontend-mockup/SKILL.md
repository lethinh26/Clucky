---
name: clucky-frontend-mockup
description: Use when prototyping Clucky's spacious food UI.
version: 0.1.0
author: Le Phu Thinh, Hermes Agent
license: MIT
platforms: [windows, macos, linux]
metadata:
  hermes:
    tags: [clucky, frontend, mockup, html, ui, food-ordering]
    related_skills: [claude-design, design-reference-extraction]
---

# Clucky Frontend Mockup

Create standalone HTML prototypes for Clucky before touching the production project. The prototype should be visually calm, spacious, easy to scan, and centered on one primary food-ordering action rather than packing in features or content.

## When to Use

- Use when the user asks to see or approve a Clucky interface quickly.
- Use when exploring homepage, menu, ordering, or customer-facing layout direction.
- Do not modify the Clucky repository unless the user explicitly approves moving from prototype to implementation.

## Locked Visual Direction

- Prioritize whitespace, thick padding, clear hierarchy, and low cognitive load.
- Use one main visual idea per section; do not fill empty space with invented content.
- Prefer a large hero with one primary CTA, one secondary CTA, and a focused food image.
- Keep navigation short and practical: logo, menu, stores, order.
- Use a small featured-food selection instead of a dense product catalog in the first mockup.
- Use Clucky brand tokens from the project guidelines:
  - Espresso `#16100D`
  - Cream `#F5EDE0`
  - Wine Red `#8F1216`
  - Burnished Gold `#C9A227`
- Use Fredoka for headings and Quicksand for body text.
- Keep the tone premium, warm, friendly, and food-focused; avoid childish or noisy decoration.
- Use rounded cards and pill actions, but preserve hierarchy through type and spacing rather than excessive containers.

## Workflow

1. Read the relevant Clucky brand and UI requirements with `read_file`; do not guess the palette or typography.
2. Inspect the current project state with `search_files` or `read_file` only for visual context. Treat the repository as read-only during prototyping.
3. State the surface archetype before designing. Homepage marketing prototypes are `Decide / Learn`; menu browsing is `Explore`.
4. Create a single self-contained HTML file outside the repository using `write_file`. Embed CSS and minimal JavaScript; avoid adding dependencies.
5. Include responsive CSS, keyboard-visible focus states, semantic landmarks, alt text, and reduced-motion support.
6. Use real food imagery only when it helps the visual review. Mark copy as draft when it is not finalized.
7. Open the file with `browser_exec`, inspect the primary desktop viewport, and check the document structure, key text, images, and responsive rules.
8. Run a local file existence/structure check with `terminal` before reporting the artifact.

## Composition Default

Use this sparse homepage structure unless the user chooses another direction:

1. Dark Espresso header and hero.
2. Large Fredoka headline with generous line-height and a short supporting paragraph.
3. One prominent food image as the visual anchor.
4. Wine Red primary action and restrained outlined secondary action.
5. One short brand statement section with generous vertical padding.
6. A small three-item featured menu row.
7. Minimal Espresso footer.

Avoid feature grids, fake statistics, testimonials, badges everywhere, carousels, dense filters, and extra marketing sections in the first pass.

## Interaction Rules

- Primary CTA must point to the main ordering/menu path in the prototype.
- Buttons and links need visible hover/focus treatment.
- Mobile controls must remain at least 44px tall/wide.
- Do not add complex state or fake backend behavior unless interaction is explicitly requested.
- If an image fails to load, report it rather than inventing a successful visual verification.

## Verification

Before claiming the prototype is ready:

- Confirm the HTML file exists and is outside the production repository.
- Open it in a browser and verify the title, main heading, number of sections, and primary cards.
- Confirm the project `git status` contains no change caused by the prototype.
- Check at least one desktop viewport and one mobile-width layout when the browser remains stable.
- Report any browser timeout or unverified check plainly.

## Pitfalls

- Do not copy KFC, Texas Chicken, or McDonald's branding or proprietary layout. Extract only broad principles: sparse composition, clear navigation, strong food imagery, and direct ordering.
- Do not turn spaciousness into a blank page; use scale, rhythm, and one strong visual anchor.
- Do not place the brand red and gold on every surface. Keep neutral surfaces dominant and accents purposeful.
- Do not claim the repository was untouched without checking `git status`.
- Do not claim mobile or image verification if the browser tool timed out or assets did not load.
