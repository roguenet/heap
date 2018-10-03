/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components';
import { DisplayState } from '../DisplayState';
import LightBoxImage from '../LightBoxImage';
import { animationDuration } from '../styleConstants';
import { Description, Title } from '../Text';
import StyledLightBox from './StyledLightBox';

const Shim = styled.div`
  height: 6px;
`;

export default class PhotoLightBox extends Component {
  static propTypes = {
    sources: PropTypes.arrayOf(PropTypes.shape({
      src: PropTypes.string.isRequired,
      width: PropTypes.number.isRequired,
    })).isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    meta: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      keywords: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    offsetX: PropTypes.number.isRequired,
    offsetY: PropTypes.number.isRequired,
    rotation: PropTypes.number.isRequired,
    displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired,
  };

  state = {
    removeHidden: true,
  };

  get sources() {
    return this.props.sources;
  }

  componentDidUpdate({ displayState }) {
    if (displayState !== this.props.displayState) {
      this.setState({ removeHidden: false });
      // This assumes this component never leaves the DOM.
      this.animationTimeout =
        setTimeout(() => this.setState({ removeHidden: true }), animationDuration);
    }
  }

  componentWillUnmount() {
    if (this.animationTimeout != null) clearTimeout(this.animationTimeout);
  }

  fullSrcSet = () => this.sources.map(({ src, width }) => `${src} ${width}w`).join(',');

  inactiveSrcSet = () => `${this.sources[0].src} ${this.sources[0].width}w`;

  sizes = () => {
    const { width, height } = this.props;
    const boxWidth = 'calc(100vw - 300px)';
    const boxHeight = `calc((100vh - 300px) * ${width / height})`;
    // Tell the browser what size we expect the image to display at. Uses the same logic as
    // the imageSize() function in LightBoxImage.
    return width > height ? `
      (max-aspect-ratio: ${width}/${height + 300}) ${boxWidth},
      ${boxHeight}
    ` : `
      (min-aspect-ratio: ${width + 300}/${height}) ${boxHeight},
      ${boxWidth}
    `;
  };

  render() {
    const { width, height, displayState, meta, rotation, offsetX, offsetY } = this.props;
    const { removeHidden } = this.state;
    return <StyledLightBox
      displayState={ displayState }
      rotation={ rotation }
      offsetX={ offsetX }
      offsetY={ offsetY }
      style={ {
        '--rotation': `${rotation}deg`,
        '--offsetX': offsetX,
        '--offsetY': offsetY,
      } }
    >
      <LightBoxImage
        srcSet={
          displayState === DisplayState.INACTIVE ? this.inactiveSrcSet() : this.fullSrcSet()
        }
        sizes={ this.sizes() }
        imageWidth={ width }
        imageHeight={ height }
        style={ displayState === DisplayState.HIDDEN && removeHidden ? { display: 'none' } : null }
      />
      { displayState === DisplayState.INACTIVE && <img
        srcSet={ this.fullSrcSet() }
        sizes={ this.sizes() }
        style={ { display: 'none' } }
      /> }
      { (meta.title || meta.description) && <Shim/> }
      { meta.title && <Title className='heap-lightBoxTitle'>{ meta.title }</Title> }
      { meta.description && <Description className='heap-lightBoxDescription'>{
        meta.description
      }</Description> }
    </StyledLightBox>;
  }
}
