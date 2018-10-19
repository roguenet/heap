/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { DisplayState } from '../DisplayState'
import { loadHeapJson } from '../JsonLoader'
import LightBox from '../LightBox/index'
import { baseBackground } from '../styleConstants'

// The maximum number of images to display in the background. Limiting is useful for large
// Heaps, for performance reason. Note: It's useful to keep this number set to a perfect square
// for JsonLoader's bucket generation algorithm
export const MAX_BACKGROUND = 36

const StyledHeap = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  background: ${baseBackground};
  align-items: center;
  justify-content: center;
`

export default class Heap extends Component {
  static propTypes = {
    src: PropTypes.string.isRequired,
    className: PropTypes.string,

    navigation: PropTypes.shape({
      push: PropTypes.func.isRequired,
      replace: PropTypes.func.isRequired
    }).isRequired,
    currentCardPath: PropTypes.string,

    children: PropTypes.func
  };

  state = {
    cards: null,
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
    loadHeapJson(this.props.src).then(config => this.setState({ config }))
  }

  componentDidUpdate ({ currentCardPath: previousCardPath }, { config: previousConfig }) {
    const { currentCardPath } = this.props
    const { config } = this.state
    const configSet = previousConfig == null && config != null
    const pathChanged = currentCardPath !== previousCardPath
    if (
      (configSet || pathChanged) &&
      (currentCardPath == null || !this.cardPathIsValid(currentCardPath))
    ) {
      this.props.navigation.replace(this.cards[0].path)
    }
  }

  // assumes all card paths are valid until we've received our cards set.
  cardPathIsValid = cardPath => this.cards == null ||
    this.cards.find(({ path }) => path === cardPath) != null;

  cardIndex = cardPath => this.cards.findIndex(({ path }) => cardPath === path);

  goToFirst = () => {
    if (this.currentIndex > 0) this.props.navigation.push(this.cards[0].path)
  };

  goBack = () => {
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
    const { currentCardPath, children } = this.props
    const { config, navigator } = this.state
    if (config == null || !this.cardPathIsValid(currentCardPath)) return null

    const currentIndex = this.currentIndex
    const cardContext = {
      config,
      card: config.cards[currentIndex],
      isFirst: currentIndex === 0,
      isLast: currentIndex === config.cards.length - 1
    }

    return <StyledHeap className={this.props.className} onClick={this.goForward}>
      { [...config.cards].reverse().map(this.renderLightBox) }
      { children && children(navigator, cardContext) }
    </StyledHeap>
  }
}
