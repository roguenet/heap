/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

const RESET = '\x1b[0m';

let verbose = false;
export const setVerbose = value => verbose = value;

export const Log = {
  feedback: (...args) => console.log(`${BLUE}%s${RESET}`, ...args),
  info: (...args) => verbose && console.log(`${GREEN}%s${RESET}`, ...args),
  warning: (...args) => verbose && console.log(`${YELLOW}%s${RESET}`, ...args),
  error: (...args) => console.error(`${RED}%s${RESET}`, ...args),

  blue: str => `${BLUE}${str}${RESET}`
};
