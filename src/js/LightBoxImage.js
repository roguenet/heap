/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-env browser */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { DisplayState } from './DisplayState'
import Loading from './Loading'
import { animationDuration, lightBoxBorder } from './styleConstants'

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
`

const StyledLightBoxImage = styled.img`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
`

const StyledLightBoxPreview = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-size: cover;
  transition: opacity ${animationDuration * 2}ms ease-in-out;
  ${({ displayState }) => displayState.previewStyles}
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
    loading: true
  }

  componentDidMount () {
    this.loadImage()
  }

  componentDidUpdate ({ srcSet }) {
    if (srcSet !== this.props.srcSet) {
      this.setState({ loading: true })
      this.loadImage()
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

    let previewBox = null
    if (preview != null) {
      previewBox = <StyledLightBoxPreview
        {...childProps}
        displayState={this.state.loading ? DisplayState.BACKGROUND : displayState}
        style={{ background: `url(data:image/svg+xml;base64,${preview})` }}
      />
    }

    let image = null
    if (!this.state.loading && displayState === DisplayState.ACTIVE) {
      image = <StyledLightBoxImage {...childProps} srcSet={srcSet} sizes={sizes} />
    }

    let loading = null
    if (this.state.loading && displayState === DisplayState.ACTIVE) {
      loading = <Loading />
    }

    return <LightBoxImageContainer {...childProps}>
      { image }
      { previewBox }
      { loading }
    </LightBoxImageContainer>
  }
}
