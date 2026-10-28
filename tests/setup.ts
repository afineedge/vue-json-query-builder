import * as matchers from 'vitest-axe/matchers'
import { expect } from 'vitest'

expect.extend(matchers)

// vitest-axe 0.1 types its matcher against the old global `Vi` namespace; Vitest 5 reads `Matchers<R, T>`.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R, T> {
    toHaveNoViolations(): R
  }
}
