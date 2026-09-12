import { expect, it } from 'vitest'
import { addProgress, type ProgressPoint } from '../src/lib/progress'

it('records actual utilization changes in percentage points and skips identical observations', () => {
  let history: ProgressPoint[] = []
  history = addProgress(history, 2, 100, 20, 10, 1)
  expect(history).toEqual([{ seconds: 2, utilization: 50 }])
  history = addProgress(history, 4, 100, 20, 10, 1)
  expect(history).toHaveLength(1)
  history = addProgress(history, 6, 100, 16, 10, 1)
  expect(history[1]).toEqual({ seconds: 6, utilization: 62.5 })
  expect(history[1]!.utilization - history[0]!.utilization).toBe(12.5)
})

it('includes all bins and rejects invalid dimensions or elapsed time', () => {
  expect(addProgress([], 3, 100, 10, 10, 2)[0]!.utilization).toBe(50)
  expect(addProgress([], NaN, 100, 10, 10, 2)).toEqual([])
  expect(addProgress([], 3, 100, 0, 10, 2)).toEqual([])
})
