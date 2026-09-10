import { expect, it } from 'vitest'
import { centroid } from '../src/lib/geometry'

it('positions labels by area instead of the bounding-box center', () => {
  expect(centroid([[0, 0], [6, 0], [0, 3]])).toEqual([2, 1])
  const point = centroid([[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]])
  expect(point[0]).toBeCloseTo(19 / 14)
  expect(point[1]).toBeCloseTo(19 / 14)
})
