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
import { fadeDuration, lightBoxBorder } from './styleConstants'

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
  border: 1px solid ${lightBoxBorder};
  ${imageSize};
  position: relative;
  background-size: cover;
`

const imageFade = keyframes`
  0% {
    opacity: 0;
  }
  
  100% {
    opacity: 100;
  }
`

const StyledLightBoxImage = styled.img`
  position: absolute;
  left: 0;
  top: 0;
  
  &.fadeIn {
    opacity: 0;
    animation: ${imageFade} ${fadeDuration}ms ease-in-out;
    animation-fill-mode: forwards;
  }
  
  &.fadeOut {
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
    fadingIn: false,
    fadingOut: false
  }

  componentDidMount () {
    this.loadImage()
  }

  componentDidUpdate ({ srcSet, displayState }) {
    if (srcSet !== this.props.srcSet) {
      this.setState({ loading: true })
      this.loadImage()
    }

    if (displayState !== this.props.displayState) {
      if (this.props.displayState === DisplayState.ACTIVE) {
        this.setState({ fadingIn: true, fadingOut: false })
        this.clearTimer()
        this._fadeTimer = setTimeout(() => this.setState({ fadingIn: false }), fadeDuration)
      } else if (displayState === DisplayState.ACTIVE) {
        this.setState({ fadingOut: true, fadingIn: false })
        this.clearTimer()
        this._fadeTimer = setTimeout(() => this.setState({ fadingOut: false }), fadeDuration)
      }
    }
  }

  componentWillUnmount () {
    this.clearTimer()
  }

  clearTimer () {
    if (this._fadeTimer != null) {
      clearTimeout(this._fadeTimer)
      this._fadeTimer = null
    }
  }

  loadImage () {
    const img = new Image()
    img.onload = () => this.setState({ loading: false })
    img.sizes = this.props.sizes
    img.srcset = this.props.srcSet
  }

  render () {
    const { preview, displayState, srcSet, sizes, ...childProps } = this.props
    const { fadingIn, fadingOut } = this.state

    let image = null
    let loading = null
    if (displayState === DisplayState.ACTIVE || fadingOut) {
      if (this.state.loading) {
        loading = <Loading />
      } else {
        let className = null
        if (fadingIn) className = 'fadeIn'
        else if (fadingOut) className = 'fadeOut'
        image = <StyledLightBoxImage
          className={className}
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
