/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import PhotoLightBox from './PhotoLightBox'
import TitleLightBox from './TitleLightBox'

const Index = props => {
  switch (props.cardType) {
    case 'photo': return <PhotoLightBox {...props} />
    case 'title': return <TitleLightBox {...props} />

    default:
      console.error('Unrecognized card type!', props.cardType)
      return null
  }
}

export default Index
