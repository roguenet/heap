/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MAX_BACKGROUND } from './Heap/Heap'
import { dropShadow, inactiveScale } from './styleConstants'

const BACKGROUND_TRANSFORM = `
  transform: 
    translate3d(
      calc(var(--offsetX) * 100vw),
      calc(var(--offsetY) * 100vh),
      0
    )
    rotate(var(--rotation))
    scale(${inactiveScale});
`

const ACTIVE_BORDER = `
  border: none;
  border-radius: 4px;
  box-shadow: 2px 2px 10px ${dropShadow};
`

export const DisplayState = (name, props) => ({ name, ...props })

DisplayState.calculate = (index, currentIndex) => {
  if (index === currentIndex) return DisplayState.ACTIVE
  else if (index < currentIndex) return DisplayState.HIDDEN
  else if ((index - currentIndex) > MAX_BACKGROUND) return DisplayState.BURIED
  else return DisplayState.BACKGROUND
}

Object.entries({
  BURIED: {
    lightBoxStyles: `
      ${BACKGROUND_TRANSFORM}
      display: none;
    `,
    previewStyles: ``
  },

  BACKGROUND: {
    lightBoxStyles: `
      ${BACKGROUND_TRANSFORM}
    `,
    previewStyles: `
      opacity: 100;
    `
  },

  ACTIVE: {
    lightBoxStyles: `
      transform: translate3d(0, 0, 0);
      ${ACTIVE_BORDER}
    `,
    previewStyles: `
      opacity: 0;
    `
  },

  HIDDEN: {
    lightBoxStyles: `
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      opacity: 0;
      ${ACTIVE_BORDER}
    `,
    previewStyles: `
      opacity: 100;
    `
  }
// eslint-disable-next-line no-return-assign
}).forEach(([name, props]) => DisplayState[name] = DisplayState(name, props))
