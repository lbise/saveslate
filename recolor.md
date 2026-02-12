# Recolor

## Context

I want to refine the theme of MeloMoney my personal finance manager web app.
This app is for personal use, not for business. The theme is very minimalist and dark only, think nordic/noir minimalism.
I'd like to convey that this app is cool and calming with an unserious pinch.
The expense and income colors are very important since every transactions are either that or a transfer.
There is also the possibility to create goals to save money. Another feature is that the user can split a transaction with
another user. Currently there is no color defined for this aspect.

Deeply analyse the palette, keeping in mind what I just told you, and create a new cohesive one that keeps the original intent intact.
I attached a picture of the current state of the mock up application.

## Frontend Aesthetics Guidelines

- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Current Theme

Here is the current theme, create a new one.

```
@theme {
  /* Dark-only palette */
  --color-bg: #111111;
  --color-surface: #161616;
  --color-surface-hover: #1a1a1a;
  --color-border: #252525;

  --color-text: #ffffff;
  --color-text-secondary: #888888;
  --color-text-muted: #555555;

  --color-accent: #2dd4bf;
  --color-goal: #7e9ab3;
  --color-income: #6fcf97;
  --color-expense: #eb5757;
  --color-transfer: #5b9cf6;

  /* Shadows */
  --shadow: none;
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.3);

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 10px;
  --radius-full: 9999px;

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;

  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;

  /* Fonts */
  --font-display: "Sora", sans-serif;
  --font-body: "DM Sans", sans-serif;
}
```
