import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'file:./test.db'
process.env.ALPHA_VANTAGE_API_KEY = 'test-alpha-vantage-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.HUGGINGFACE_API_KEY = 'test-huggingface-key'
process.env.TAVILY_API_KEY = 'test-tavily-key'
process.env.NODE_ENV = 'test'

// Global test utilities
global.testUtils = {
  async waitFor(callback: () => boolean, timeout = 5000) {
    const startTime = Date.now()
    while (!callback()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition')
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

// Suppress console errors in tests (optional)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
