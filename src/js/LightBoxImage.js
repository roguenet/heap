/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import styled from 'styled-components'
import { lightBoxBorder } from './styleConstants'

const LIGHT_BOX_MARGIN = 300
const IMAGE_WIDTH = `100vw - ${LIGHT_BOX_MARGIN}px`
const IMAGE_HEIGHT = `100vh - ${LIGHT_BOX_MARGIN}px`

// Size the image based on width or height depending on the aspect ratio of the image and the
// aspect ratio of the browser window.
export const imageSize = ({ imageWidth, imageHeight }) => imageWidth > imageHeight ? `
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

const LightBoxImage = styled.img`
  border-radius: 4px;
  border: 1px solid ${lightBoxBorder};
  ${imageSize}
`

LightBoxImage.propTypes = {
  imageWidth: PropTypes.number.isRequired,
  imageHeight: PropTypes.number.isRequired
}

export default LightBoxImage
