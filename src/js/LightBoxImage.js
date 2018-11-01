/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-env browser */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled, { keyframes } from 'styled-components'
import { DisplayState } from './DisplayState'
import Loading from './Loading'
import { fadeDuration } from './styleConstants'

const LIGHT_BOX_MARGIN = 300
const IMAGE_WIDTH = `100vw - ${LIGHT_BOX_MARGIN}px`
const IMAGE_HEIGHT = `100vh - ${LIGHT_BOX_MARGIN}px`

// Size the image based on width or height depending on the aspect ratio of the image and the
// aspect ratio of the browser window.
const imageSize = ({ imageWidth, imageHeight }) => imageWidth > imageHeight ? `
  width: calc(${IMAGE_WIDTH});
  height: calc((${IMAGE_WIDTH}) * ${imageHeight / imageWidth});
  @media(min-aspect-ratio: ${imageWidth}/${imageHeight + LIGHT_BOX_MARGIN}) {
    width: calc((${IMAGE_HEIGHT}) * ${imageWidth / imageHeight});
    height: calc(${IMAGE_HEIGHT});
  }
` : `
  width: calc((${IMAGE_HEIGHT}) * ${imageWidth / imageHeight});
  height: calc(${IMAGE_HEIGHT});
  @media(max-aspect-ratio: ${imageWidth + LIGHT_BOX_MARGIN}/${imageHeight}) {
    width: calc(${IMAGE_WIDTH});
    height: calc((${IMAGE_WIDTH}) * ${imageHeight / imageWidth});
  }
`

// Provide CSS for calculating the width of the copy area to match that of the image.
export const copySize = ({ imageWidth, imageHeight }) => imageWidth > imageHeight ? `
  width: calc(${IMAGE_WIDTH});
  @media(min-aspect-ratio: ${imageWidth}/${imageHeight + LIGHT_BOX_MARGIN}) {
    width: calc((${IMAGE_HEIGHT}) * ${imageWidth / imageHeight});
  }
` : `
  width: calc((${IMAGE_HEIGHT}) * ${imageWidth / imageHeight});
  @media(max-aspect-ratio: ${imageWidth + LIGHT_BOX_MARGIN}/${imageHeight}) {
    width: calc(${IMAGE_WIDTH});
  }
`

const LightBoxImageContainer = styled.div`
  border-radius: 4px;
  ${imageSize};
  position: relative;
  background-size: cover;
  transform: translate3d(0, 0, 0);
`

const imageFade = keyframes`
  0% {
    opacity: 0;
  }
  
  100% {
    opacity: 100;
  }
`

const FADE = {
  IN: 'fadeIn',
  OUT: 'fadeOut'
}

const StyledLightBoxImage = styled.img`
  border-radius: 4px;
  position: absolute;
  left: 0;
  top: 0;
  transform: translate3d(0, 0, 0);
  
  &.${FADE.IN} {
    opacity: 0;
    animation: ${imageFade} ${fadeDuration}ms ease-in-out;
    animation-fill-mode: forwards;
  }
  
  &.${FADE.OUT} {
    animation: ${imageFade} ${fadeDuration}ms ease-in-out reverse;
    animation-fill-mode: forwards;
  }
`

export default class LightBoxImage extends Component {
  static propTypes = {
    imageWidth: PropTypes.number.isRequired,
    imageHeight: PropTypes.number.isRequired,
    srcSet: PropTypes.string.isRequired,
    sizes: PropTypes.string.isRequired,
    preview: PropTypes.string,
    displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired
  }

  state = {
    loading: true,
    fading: null
  }

  componentDidMount () {
    this.loadImage()
  }

  componentDidUpdate ({ srcSet, displayState }) {
    let loading = false
    if (srcSet !== this.props.srcSet) {
      loading = true
      this.setState({ loading })
      this.loadImage()
    }

    if (displayState !== this.props.displayState) {
      if (this.props.displayState === DisplayState.ACTIVE) {
        if (!this.state.loading && !loading) {
          this.fade(FADE.IN)
        }
      } else if (displayState === DisplayState.ACTIVE) {
        this.fade(FADE.OUT)
      }
    }
  }

  componentWillUnmount () {
    this.clearTimer()
  }

  fade (direction) {
    this.clearTimer()
    this.setState({ fading: direction })
    this._fadeTimer = setTimeout(() => this.setState({ fading: null }), fadeDuration)
  }

  clearTimer () {
    if (this._fadeTimer != null) {
      clearTimeout(this._fadeTimer)
      this._fadeTimer = null
    }
  }

  onLoad = () => {
    this.setState({ loading: false })
    if (this.props.displayState === DisplayState.ACTIVE) this.fade(FADE.IN)
  }

  loadImage () {
    const img = new Image()
    img.onload = this.onLoad
    img.sizes = this.props.sizes
    img.srcset = this.props.srcSet
  }

  render () {
    const { preview, displayState, srcSet, sizes, ...childProps } = this.props
    const { fading } = this.state

    let image = null
    let loading = null
    if (displayState === DisplayState.ACTIVE || fading === FADE.OUT) {
      if (this.state.loading) {
        loading = <Loading />
      } else {
        image = <StyledLightBoxImage
          className={fading}
          {...childProps}
          srcSet={srcSet}
          sizes={sizes}
        />
      }
    }

    let containerStyles = null
    if (preview != null) {
      containerStyles = { background: `url(data:image/svg+xml;base64,${preview})` }
    }

    return <LightBoxImageContainer {...childProps} style={containerStyles}>
      { image }
      { loading }
    </LightBoxImageContainer>
  }
}
