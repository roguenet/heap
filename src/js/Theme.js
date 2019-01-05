/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Fragment } from 'react'

const STORY_MODE_THEME = {
  baseBackground: '#7c5f44',
  drawerBackground: 'rgba(180, 180, 180, 80%)',
  lightBoxBackground: '#f8f8f8',
  backgroundImageBorder: '#af9e9b',
  dropShadow: '#5f524f',

  activeScale: 1.8,
  inactiveScale: 1 / 1.8,
  transitionDuration: 300,
  fadeDuration: 600
}

const SCREENSAVER_MODE_THEME = {
  ...STORY_MODE_THEME,
  transitionDuration: 1000,
  fadeDuration: 3000
}

const THEME_FOR_MODE = {
  story: STORY_MODE_THEME,
  screensaver: SCREENSAVER_MODE_THEME
}

let theme
export const setMode = mode => {
  theme = THEME_FOR_MODE[mode]
}

export const UseTheme = ({ children }) => <Fragment>{ children(theme) }</Fragment>
export const getTheme = () => theme
