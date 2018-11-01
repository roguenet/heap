/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import React, { Component } from 'react'
import Remarkable from 'remarkable'
import styled from 'styled-components'
import { DisplayState } from '../DisplayState'
import { Description, Title } from '../Text'
import { UseTheme } from '../Theme'
import StyledLightBox from './StyledLightBox'

const StyledTitleBox = styled.div`
  max-width: 60vw;
  min-width: 40vw;
  max-height: 80vh;
  overflow-y: scroll;
  cursor: default;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
 
  .heap-lightBoxDescription {
    text-align: initial;
  
    > :last-child { 
      margin-bottom: 0;
    }
  }
`

const md = new Remarkable('full', {
  html: true,
  linkTarget: '_blank',
  typographer: true
})

export default class TitleLightBox extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    offsetX: PropTypes.number.isRequired,
    offsetY: PropTypes.number.isRequired,
    rotation: PropTypes.number.isRequired,
    displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired
  };

  maybeSwallowEvent = event => {
    if (event.target.tagName === 'A') event.stopPropagation()
  };

  render () {
    const { title, description, displayState, rotation, offsetX, offsetY } = this.props
    return <UseTheme>{ theme =>
      <StyledLightBox
        theme={theme}
        displayState={displayState}
        onClick={this.maybeSwallowEvent}
        style={{
          '--rotation': `${rotation}deg`,
          '--offsetX': offsetX,
          '--offsetY': offsetY
        }}
      >
        <StyledTitleBox>
          <Title className='heap-lightBoxTitle'>{ title }</Title>
          <Description
            className='heap-lightBoxDescription'
            dangerouslySetInnerHTML={{ __html: md.render(description) }}
          />
        </StyledTitleBox>
      </StyledLightBox>
    }</UseTheme>
  }
}
