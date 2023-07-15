/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { DisplayState } from '../DisplayState'
import LightBox from '../LightBox/index'
import { UseTheme } from '../Theme'
import { processConfig, screensaverModeCards } from './processConfig'

// The maximum number of images to display in the background. Limiting is useful for large
// Heaps, for performance reason. Note: It's useful to keep this number set to a perfect square
// for processConfig's bucket generation algorithm
export const MAX_BACKGROUND = 36

export const SCREENSAVER_MIN_TIME = 8000
export const SCREENSAVER_MAX_TIME = 10000
const screensaverNavTimeout = () =>
  Math.random() * (SCREENSAVER_MAX_TIME - SCREENSAVER_MIN_TIME) + SCREENSAVER_MIN_TIME

const StyledHeap = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: ${({ theme }) => theme.baseBackground};
  align-items: center;
  justify-content: center;
`

export const HEAP_SHAPE = PropTypes.shape({
  copyright: PropTypes.string,
  copyrightCovers: PropTypes.arrayOf(PropTypes.string),
  archiveUrl: PropTypes.string,
  archiveSize: PropTypes.number,
  cards: PropTypes.arrayOf(PropTypes.oneOfType([
    // photo card
    PropTypes.exact({
      cardType: PropTypes.oneOf(['photo']).isRequired,
      path: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired,
      height: PropTypes.number.isRequired,
      preview: PropTypes.string,
      sources: PropTypes.arrayOf(PropTypes.exact({
        src: PropTypes.string.isRequired,
        width: PropTypes.number.isRequired,
        size: PropTypes.number
      })),
      meta: PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
        copyright: PropTypes.string
      })
    }),

    // title card
    PropTypes.exact({
      cardType: PropTypes.oneOf(['title']).isRequired,
      path: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string
    })
  ])).isRequired
})

export default class Heap extends Component {
  static propTypes = {
    config: HEAP_SHAPE.isRequired,

    mode: PropTypes.oneOf(['story', 'screensaver']).isRequired,

    className: PropTypes.string,

    navigation: PropTypes.shape({
      push: PropTypes.func.isRequired,
      replace: PropTypes.func.isRequired
    }).isRequired,
    currentCardPath: PropTypes.string,

    children: PropTypes.func
  };

  state = {
    config: processConfig(this.props.config, this.props.mode),

    // used in screensaver mode
    iteration: 0,

    navigator: {
      first: () => this.goToFirst(),
      back: () => this.goBack(),
      forward: () => this.goForward(),
      last: () => this.goToLast()
    }
  }

  get cards () {
    return this.state.config.cards
  }

  get currentIndex () {
    return this.cardIndex(this.props.currentCardPath)
  }

  componentDidMount () {
    const { currentCardPath, navigation, mode } = this.props
    if (currentCardPath == null || !this.cardPathIsValid(currentCardPath)) {
      navigation.replace(this.cards[0].path)
    }

    if (mode === 'screensaver') {
      this._navTimer = setTimeout(this.autoForward, screensaverNavTimeout())
    }
  }

  componentDidUpdate ({ currentCardPath: previousCardPath }) {
    const { mode, currentCardPath, navigation } = this.props
    const pathChanged = currentCardPath !== previousCardPath
    if (pathChanged) {
      if (currentCardPath == null || !this.cardPathIsValid(currentCardPath)) {
        navigation.replace(this.cards[0].path)
      } else if (
        mode === 'screensaver' &&
        this.cards.length - this.currentIndex < MAX_BACKGROUND
      ) {
        const iteration = this.state.iteration + 1
        const config = {
          ...this.state.config,
          cards: [
            ...this.cards.slice(Math.max(0, this.currentIndex - 1)),
            ...screensaverModeCards(this.props.config.cards, iteration)
          ]
        }
        this.setState({ config, iteration })
      }
    }
  }

  componentWillUnmount () {
    if (this._navTimer != null) clearTimeout(this._navTimer)
  }

  autoForward = () => {
    this.goForward()
    this._navTimer = setTimeout(this.autoForward, screensaverNavTimeout())
  }

  // assumes all card paths are valid until we've received our cards set.
  cardPathIsValid = cardPath => this.cards == null ||
    this.cards.find(({ path }) => path === cardPath) != null;

  cardIndex = cardPath => this.cards.findIndex(({ path }) => cardPath === path);

  goToFirst = () => {
    if (this.props.mode === 'screensaver') return
    if (this.currentIndex > 0) this.props.navigation.push(this.cards[0].path)
  };

  goBack = () => {
    if (this.props.mode === 'screensaver') return
    const current = this.currentIndex
    if (current <= 0) return
    this.props.navigation.push(this.cards[current - 1].path)
  };

  goForward = () => {
    const current = this.currentIndex
    if (current >= this.cards.length - 1) return
    this.props.navigation.push(this.cards[current + 1].path)
  };

  goToLast = () => {
    if (this.props.mode === 'screensaver') return
    const current = this.currentIndex
    if (current === this.cards.length - 1) return
    this.props.navigation.push(this.cards[this.cards.length - 1].path)
  };

  renderLightBox = desc => {
    const currentIndex = this.currentIndex
    const index = this.cardIndex(desc.path)
    return <LightBox
      key={desc.path}
      {...desc}
      config={this.state.config}
      displayState={DisplayState.calculate(index, currentIndex)}
    />
  };

  render () {
    const { currentCardPath, children, mode } = this.props
    const { config, navigator } = this.state
    if (!this.cardPathIsValid(currentCardPath)) return null

    const currentIndex = this.currentIndex
    const cardContext = {
      config,
      card: config.cards[currentIndex],
      isFirst: currentIndex === 0,
      isLast: currentIndex === config.cards.length - 1
    }

    let controls
    let onClick
    if (mode === 'story' && children != null) {
      controls = children(navigator, cardContext)
      onClick = this.goForward
    }

    return <UseTheme>{ theme =>
      <StyledHeap theme={theme} className={this.props.className} onClick={onClick}>
        { [...config.cards].reverse().map(this.renderLightBox) }
        { controls }
      </StyledHeap>
    }</UseTheme>
  }
}
