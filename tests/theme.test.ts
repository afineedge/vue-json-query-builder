import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(__dirname, '../src')
const theme = readFileSync(join(src, 'theme.css'), 'utf8')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? sourceFiles(join(dir, e.name)) : /\.(vue|ts)$/.test(e.name) ? [join(dir, e.name)] : [],
  )
}

const componentSource = sourceFiles(join(src, 'components'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n')

const definedColors = new Set([...theme.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]!))
const usedColors = new Set(
  [...componentSource.matchAll(/\b(?:bg|text|border|ring|outline|fill|divide)-((?:primary|danger|neutral|light)[a-z-]*)/g)].map(
    (m) => m[1]!,
  ),
)

// The tokens the first host app defines; templates may use only these (see the spec).
const HOST_TOKENS = [
  'primary', 'primary-hover', 'primary-active', 'primary-focus',
  'danger', 'danger-hover', 'danger-active',
  'neutral-border', 'neutral-light', 'neutral-dark', 'neutral-white', 'neutral-very-light', 'light',
]

describe('theme.css', () => {
  it('defines every color token the components use', () => {
    expect(usedColors.size).toBeGreaterThan(5)
    for (const color of usedColors) expect(definedColors, `--color-${color}`).toContain(color)
  })

  it('uses only the host app token names', () => {
    for (const color of usedColors) expect(HOST_TOKENS).toContain(color)
    expect([...definedColors].sort()).toEqual([...HOST_TOKENS].sort())
  })

  it('defines the radius and font-size tokens the components use', () => {
    const sizes = new Set([...componentSource.matchAll(/\btext-(xs|sm|base|lg|xl)\b/g)].map((m) => m[1]))
    for (const size of sizes) expect(theme).toContain(`--text-${size}:`)
    expect(theme).toContain('--radius:')
    expect(theme).toContain('--radius-sm:')
  })

  it('uses @theme default so app tokens win, and points Tailwind at the components', () => {
    expect(theme).toMatch(/@theme default\s*\{/)
    expect(theme).toMatch(/@source "\.\/";/)
  })
})
