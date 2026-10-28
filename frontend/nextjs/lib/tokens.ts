/**
 * Clucky brand design tokens.
 *
 * Source of truth for the customer app's theme. These values are also
 * declared as CSS custom properties in `app/globals.css` (`:root`), which is
 * what components consume at runtime via Tailwind v4 `@theme`.
 *
 * Keep these two in sync when brand colors change.
 */
export const brand = {
  color: {
    espresso: '#16100D',
    cream: '#F5EDE0',
    paper: '#FFFAF3',
    wine: '#8F1216',
    gold: '#C9A227',
    muted: '#75675E',
    line: '#E8DED1',
    success: '#1E7A46',
    info: '#22577A',
    warning: '#D97706',
    danger: '#B42318',
  },
  radius: {
    sm: '0.6rem',
    md: '0.8rem',
    lg: '1rem',
    xl: '1.4rem',
    pill: '999px',
  },
  font: {
    heading: "'Baloo 2', sans-serif",
    body: "'Quicksand', 'Baloo 2', system-ui, sans-serif",
  },
  shadow: {
    card: '0 18px 50px rgba(22,16,13,.1)',
    hero: '0 30px 70px rgba(0,0,0,.4)',
  },
} as const;

export type BrandColor = keyof typeof brand.color;
export default brand;

