/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Remarkable from 'remarkable';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import styled from 'styled-components';
import { DisplayState } from '../DisplayState';
import { Description, Title } from '../Text';
import StyledLightBox from './StyledLightBox';

const StyledTitleBox = styled.div`
  max-width: 60vw;
  min-width: 40vw;
  max-height: 80vh;
  min-height: 40vh;
  overflow-y: scroll;
  cursor: default;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
 
  .heap-lightBoxDescription {
    text-align: initial;
  }
`;

const md = new Remarkable('full', {
  html: true,
  linkTarget: '_blank',
  typographer: true,
});

export default class TitleLightBox extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    offsetX: PropTypes.number.isRequired,
    offsetY: PropTypes.number.isRequired,
    rotation: PropTypes.number.isRequired,
    displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired,
  };

  maybeSwallowEvent = event => {
    if (event.target.tagName === 'A') event.stopPropagation();
  };

  render() {
    const { title, description, displayState, rotation, offsetX, offsetY } = this.props;
    return <StyledLightBox
      displayState={ displayState }
      rotation={ rotation }
      offsetX={ offsetX }
      offsetY={ offsetY }
      onClick={ this.maybeSwallowEvent }
    >
      <StyledTitleBox>
        <Title className='heap-lightBoxTitle'>{ title }</Title>
        <Description
          className='heap-lightBoxDescription'
          dangerouslySetInnerHTML={{ __html: md.render(description) }}
        />
      </StyledTitleBox>
    </StyledLightBox>;
  }
}
