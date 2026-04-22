import { parseWebEnv } from './env'

describe('parseWebEnv', () => {
  it('parses and normalizes the configured API base URL', () => {
    expect(
      parseWebEnv({
        VITE_API_BASE_URL: ' https://api.staging.handrix.test/ ',
        VITE_HANDRIX_ENV: 'staging',
      }).apiBaseUrl,
    ).toBe('https://api.staging.handrix.test')
  })

  it('rejects a missing API base URL', () => {
    expect(() =>
      parseWebEnv({
        VITE_HANDRIX_ENV: 'development',
      }),
    ).toThrow(
      'Missing required VITE_API_BASE_URL value.',
    )
  })

  it('rejects malformed API base URLs', () => {
    expect(() =>
      parseWebEnv({
        VITE_API_BASE_URL: 'not-a-url',
        VITE_HANDRIX_ENV: 'development',
      }),
    ).toThrow('Invalid VITE_API_BASE_URL value: not-a-url')
  })

  it('rejects a missing frontend environment name', () => {
    expect(() =>
      parseWebEnv({
        VITE_API_BASE_URL: 'https://api.handrix.test',
      }),
    ).toThrow('Missing required VITE_HANDRIX_ENV value.')
  })

  it('rejects unknown frontend environment names', () => {
    expect(() =>
      parseWebEnv({
        VITE_API_BASE_URL: 'https://api.handrix.test',
        VITE_HANDRIX_ENV: 'qa',
      }),
    ).toThrow('Invalid VITE_HANDRIX_ENV value: qa')
  })
})

describe('getApiBaseUrl', () => {
  it('reads from import.meta.env through the typed parser', async () => {
    const originalValue = import.meta.env.VITE_API_BASE_URL
    const originalEnvironment = import.meta.env.VITE_HANDRIX_ENV

    import.meta.env.VITE_API_BASE_URL = 'https://api.handrix.test/'
    import.meta.env.VITE_HANDRIX_ENV = 'production'

    vi.resetModules()

    const { getApiBaseUrl } = await import('./env')

    expect(getApiBaseUrl()).toBe('https://api.handrix.test')

    import.meta.env.VITE_API_BASE_URL = originalValue
    import.meta.env.VITE_HANDRIX_ENV = originalEnvironment
  })
})
