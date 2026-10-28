// Token utility classes shared by the default controls. Kept as full literal strings so
// consumers' Tailwind `@source` scan of dist/ finds them. Focus uses outlines, not rings,
// so it still shows in forced-colors (Windows High Contrast) mode, which drops box shadows.

export const controlClass =
  'block w-full rounded border border-neutral-border bg-neutral-white px-2 py-1 text-sm text-neutral-dark ' +
  'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary-focus ' +
  'disabled:cursor-not-allowed disabled:bg-neutral-light disabled:opacity-60 ' +
  'placeholder:text-neutral-dark/80 aria-invalid:border-danger'

export const buttonVariants = {
  primary:
    'border border-primary bg-primary text-neutral-white hover:border-primary-hover hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'border border-neutral-border bg-neutral-white text-neutral-dark hover:bg-neutral-light active:bg-neutral-very-light',
  danger:
    'border border-neutral-border bg-neutral-white text-danger hover:border-danger-hover hover:bg-danger-hover hover:text-neutral-white active:bg-danger-active',
} as const

export type ButtonVariant = keyof typeof buttonVariants

export const buttonClass =
  'inline-flex items-center justify-center gap-1 rounded px-2 py-1 text-sm font-medium whitespace-nowrap ' +
  'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-primary-focus ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none'
