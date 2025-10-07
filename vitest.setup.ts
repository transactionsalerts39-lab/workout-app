import '@testing-library/jest-dom/vitest'

beforeAll(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }))
})
