/**
 * Utility: cn() — className merge helper
 * Combines clsx + tailwind-merge-like dedup in a simple form.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
