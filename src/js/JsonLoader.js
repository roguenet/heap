/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { MAX_BACKGROUND } from './Heap/Heap'

const MAX_ROTATION = 60
const MIN_ROTATION = 20

function * generateBuckets (numBuckets) {
  const maxPerSide = Math.floor(Math.sqrt(numBuckets))
  const length = 1 / maxPerSide
  for (let x = 0; x < maxPerSide; x++) {
    for (let y = 0; y < maxPerSide; y++) {
      const minX = -0.5 + x * length
      const minY = -0.5 + y * length
      yield {
        minX,
        maxX: minX + length,
        minY,
        maxY: minY + length
      }
    }
  }
}

const randomInRange = (min, max) => Math.random() * (max - min) + min
const randomInvert = value => Math.random() < 0.5 ? value : value * -1

export async function loadHeapJson (src) {
  const config = await (await window.fetch(src)).json()
  const numBuckets = Math.min(config.cards.length - 1, MAX_BACKGROUND)
  let buckets = []

  return {
    ...config,
    cards: config.cards.map((card, index) => {
      if (index === 0) {
        // The first card is never displayed minimized so don't let it take up a bucket
        return { ...card, offsetX: 0, offsetY: 0, rotation: 0 }
      }

      if (buckets.length === 0) buckets = [...generateBuckets(numBuckets)]
      const { minX, maxX, minY, maxY } = buckets.splice(Math.random() * buckets.length, 1)[0]

      return {
        ...card,
        offsetX: randomInRange(minX, maxX),
        offsetY: randomInRange(minY, maxY),
        rotation: randomInvert(randomInRange(MIN_ROTATION, MAX_ROTATION))
      }
    })
  }
}
