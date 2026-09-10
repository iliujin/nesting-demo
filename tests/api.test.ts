import { expect, it } from 'vitest'
import { parseConfig, parseResult } from '../src/lib/api'

it('requires HTTPS and forbids embedded credentials in public API configuration', () => {
  expect(parseConfig({ mode: 'live', apiBaseUrl: 'https://api.example.com' }).mode).toBe('live')
  expect(() => parseConfig({ mode: 'live', apiBaseUrl: 'http://10.0.0.1' })).toThrow()
  expect(() => parseConfig({ mode: 'live', apiBaseUrl: 'https://secret:password@api.example.com' })).toThrow()
  expect(parseConfig({ mode: 'preview', apiBaseUrl: '' }).mode).toBe('preview')
})

it('does not accept a sample or malformed result as a real solver result', () => {
  const valid = { kind: 'solver_result', validated: true, name: 'test', mode: 'strip', width: 10, height: 20,
    containers: 1, placements: [{ id: 1, typeId: 1, container: 0, rotation: 90, polygon: [[0, 0], [10, 0], [0, 20]] }] }
  expect(parseResult(valid, 1).placements).toHaveLength(1)
  expect(() => parseResult({ ...valid, kind: 'illustrative_precomputed' }, 1)).toThrow()
  expect(() => parseResult(valid, 2)).toThrow()
  expect(() => parseResult({ ...valid, width: Infinity }, 1)).toThrow()
})
