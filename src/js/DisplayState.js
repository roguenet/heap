/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { dropShadow, inactiveScale } from './styleConstants';

const activeBorder = `
  border: none;
  border-radius: 4px;
  box-shadow: 2px 2px 10px ${dropShadow};
`;

export const DisplayState = (name, props) => ({ name, ...props });
Object.entries({
  HIDDEN: {
    lightBoxStyles: `
      pointer-events: none;
      transform: none;
      filter: opacity(0%);
      ${activeBorder}
    `
  },

  ACTIVE: {
    lightBoxStyles: `
      transform: none;
      filter: none;
      ${activeBorder}
    `
  },

  INACTIVE: {
    lightBoxStyles: `
      transform: 
        translate(
          calc(var(--offsetX) * 100vw),
          calc(var(--offsetY) * 100vh)
        )
        rotate(var(--rotation))
        scale(${inactiveScale});
      filter: grayscale(100%) brightness(80%);
    `
  }
}).forEach(([name, props]) => DisplayState[name] = DisplayState(name, props));
