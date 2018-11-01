/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MAX_BACKGROUND } from './Heap/Heap'
import { css } from 'styled-components'

const BACKGROUND_TRANSFORM = css`
  transform: 
    translate3d(
      calc(var(--offsetX) * 100vw),
      calc(var(--offsetY) * 100vh),
      0
    )
    rotate(var(--rotation))
    scale(${({ theme }) => theme.inactiveScale});
`

const ACTIVE_BORDER = css`
  border: none;
  border-radius: 4px;
  box-shadow: 2px 2px 10px ${({ theme }) => theme.dropShadow};
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
    lightBoxStyles: css`
      display: none;
      ${BACKGROUND_TRANSFORM}
    `
  },

  BACKGROUND: {
    lightBoxStyles: css`
      ${BACKGROUND_TRANSFORM}
    `
  },

  ACTIVE: {
    lightBoxStyles: css`
      transform: translate3d(0, 0, 0);
      ${ACTIVE_BORDER}
    `
  },

  HIDDEN: {
    lightBoxStyles: css`
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      opacity: 0;
      ${ACTIVE_BORDER}
    `
  }
// eslint-disable-next-line no-return-assign
}).forEach(([name, props]) => DisplayState[name] = DisplayState(name, props))
