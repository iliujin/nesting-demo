import { expect, it } from 'vitest'
import { parseConfig } from '../src/lib/api'

it('uses the LAN page origin for an explicitly same-origin live deployment', () => {
  expect(parseConfig({ mode: 'live', apiBaseUrl: '' }, false, 'http://10.20.30.40:8081'))
    .toEqual({ mode: 'live', apiBaseUrl: 'http://10.20.30.40:8081' })
})

it('does not allow an insecure API on a public page or a different LAN host', () => {
  expect(() => parseConfig({ mode: 'live', apiBaseUrl: '' }, false, 'http://example.com')).toThrow()
  expect(() => parseConfig({ mode: 'live', apiBaseUrl: 'http://10.0.0.2' }, false, 'http://10.0.0.1')).toThrow()
  expect(() => parseConfig({ mode: 'live', apiBaseUrl: 'http://10.0.0.2' }, false, 'https://iliujin.github.io')).toThrow()
})
