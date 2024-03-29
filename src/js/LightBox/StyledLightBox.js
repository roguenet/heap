/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import styled from 'styled-components'
import { DisplayState } from '../DisplayState'

const StyledLightBox = styled.div`
  transform-origin: center;
  border: 2px solid ${({ theme }) => theme.backgroundImageBorder};
  border-radius: 10px;
  padding: 10px 10px 0 10px;
  background: ${({ theme }) => theme.lightBoxBackground};
  position: fixed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-items: center;
  
  transition: 
    opacity ${({ theme }) => theme.transitionDuration}ms ease-in-out, 
    transform ${({ theme }) => theme.transitionDuration}ms ease-in-out;
  
  > :first-child {
    margin-bottom: 4px;
  }
  
  > :last-child {
    margin-bottom: 6px;
  }
  
  > :last-child:first-child {
    margin-bottom: 10px;
  }
 
  ${({ displayState }) => displayState.lightBoxStyles}
`

StyledLightBox.propTypes = {
  displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired
}

export default StyledLightBox
