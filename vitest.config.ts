import { defineConfig } from 'vitest/config'

// Kept apart from vite.config.ts so tests don't spin up the workers runtime.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
})
