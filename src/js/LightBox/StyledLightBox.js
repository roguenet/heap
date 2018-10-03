/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types';
import styled from 'styled-components';
import { DisplayState } from '../DisplayState';
import { animationDuration, backgroundImageBorder, lightBoxBackground } from '../styleConstants';

const StyledLightBox = styled.div`
  transform-origin: center;
  border: 2px solid ${backgroundImageBorder};
  border-radius: 10px;
  padding: 10px 10px 0 10px;
  background: ${lightBoxBackground};
  position: fixed;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  align-items: center;
  
  transition: filter ${animationDuration}ms ease-out, transform ${animationDuration}ms ease-out;
  
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
`;

StyledLightBox.propTypes = {
  displayState: PropTypes.oneOf(Object.values(DisplayState)).isRequired,
  rotation: PropTypes.number.isRequired,
  offsetX: PropTypes.number.isRequired,
  offsetY: PropTypes.number.isRequired,
};

export default StyledLightBox;
