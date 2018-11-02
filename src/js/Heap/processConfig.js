/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MAX_BACKGROUND } from './Heap'
import shuffle from 'lodash/shuffle'

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

const positionCard = (card, minX, maxX, minY, maxY) => ({
  ...card,
  offsetX: randomInRange(minX, maxX),
  offsetY: randomInRange(minY, maxY),
  rotation: randomInvert(randomInRange(MIN_ROTATION, MAX_ROTATION))
})

const storyModeCards = cards => {
  const numBuckets = Math.min(cards.length - 1, MAX_BACKGROUND)
  let buckets = []

  return cards.map((card, index) => {
    if (index === 0) {
      // The first card is never displayed minimized so don't let it take up a bucket
      return { ...card, offsetX: 0, offsetY: 0, rotation: 0 }
    }

    if (buckets.length === 0) buckets = [...generateBuckets(numBuckets)]
    const { minX, maxX, minY, maxY } = buckets.splice(Math.random() * buckets.length, 1)[0]

    return positionCard(card, minX, maxX, minY, maxY)
  })
}

export const screensaverModeCards = (cards, iteration = 0) =>
  // for screensaver mode, we use the same placement algorithm as story mode, but we don't show
  // any title cards and the order is scrambled
  storyModeCards(shuffle(cards.filter(({ cardType }) => cardType === 'photo'))).map(
    card => ({ ...card, path: `${card.path}-${iteration}` })
  )

const cardsForMode = (mode, cards) => {
  switch (mode) {
    case 'screensaver': return screensaverModeCards(cards)
    case 'story':
    default:
      return storyModeCards(cards)
  }
}

export function processConfig (config, mode) {
  return { ...config, cards: cardsForMode(mode, config.cards) }
}
