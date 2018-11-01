/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import isEmpty from 'lodash/isEmpty'
import PropTypes from 'prop-types'
import React, { Component } from 'react'
import styled from 'styled-components'
import { DisplayState } from '../DisplayState'
import LightBoxImage, { copySize } from '../LightBoxImage'
import { Copyright, Description, Title } from '../Text'
import StyledLightBox from './StyledLightBox'

const CopyContainer = styled.div`
  ${copySize}
`

export default class PhotoLightBox extends Component {
  static propTypes = {
    sources: PropTypes.arrayOf(PropTypes.shape({
      src: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired
    })).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    preview: PropTypes.string,
    meta: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      keywords: PropTypes.arrayOf(PropTypes.string),
      copyright: PropTypes.string
    }).isRequired,
    config: PropTypes.shape({
      copyrightCovers: PropTypes.arrayOf(PropTypes.string)
    }).isRequired,
    offsetX: PropTypes.number.isRequired,
    offsetY: PropTypes.number.isRequired,
    rotation: PropTypes.number.isRequired,
    displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired
  };

  get sources () {
    return this.props.sources
  }

  get showCopyright () {
    const { copyrightCovers } = this.props.config
    const { copyright } = this.props.meta
    return !isEmpty(copyright) && !(copyrightCovers || []).includes(copyright)
  }

  fullSrcSet = () => this.sources.map(({ src, width }) => `${src} ${width}w`).join(',');

  sizes = () => {
    const { width, height } = this.props
    const boxWidth = 'calc(100vw - 300px)'
    const boxHeight = `calc((100vh - 300px) * ${width / height})`
    // Tell the browser what size we expect the image to display at. Uses the same logic as
    // the imageSize() function in LightBoxImage.
    return width > height ? `
      (max-aspect-ratio: ${width}/${height + 300}) ${boxWidth},
      ${boxHeight}
    ` : `
      (min-aspect-ratio: ${width + 300}/${height}) ${boxHeight},
      ${boxWidth}
    `
  };

  render () {
    if (this.props.sources == null) {
      console.error('PhotoLightBox missing sources', this.props.path)
      return null
    }

    const { width, height, preview, displayState, meta, rotation, offsetX, offsetY } = this.props
    const buried = displayState === DisplayState.BURIED
    return <StyledLightBox
      displayState={displayState}
      style={{
        '--rotation': `${rotation}deg`,
        '--offsetX': offsetX,
        '--offsetY': offsetY
      }}
    >
      { !buried && <LightBoxImage
        displayState={displayState}
        srcSet={this.fullSrcSet()}
        sizes={this.sizes()}
        imageWidth={width}
        imageHeight={height}
        preview={preview}
      /> }
      <CopyContainer imageWidth={width} imageHeight={height}>
        { meta.title && <Title className='heap-lightBoxTitle'>{ meta.title }</Title> }
        { meta.description && <Description className='heap-lightBoxDescription'>{
          meta.description
        }</Description> }
        { this.showCopyright && <Copyright className='heap-lightBoxCopyright'>
          &copy; { meta.copyright }
        </Copyright> }
      </CopyContainer>
    </StyledLightBox>
  }
}
