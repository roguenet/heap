/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import React from 'react'
import HeapComponent from './Heap'
import Navigation from './Navigation'

const Heap = props => {
  const { src, className, children } = props
  if (props.navigation != null) {
    const { navigation, currentCardPath } = props
    return <HeapComponent {...{ src, className, navigation, currentCardPath, children }} />
  } else {
    return <Navigation basePath={props.basePath}>{ ({ navigation, currentCardPath }) =>
      <HeapComponent {...{ src, className, navigation, currentCardPath, children }} />
    }</Navigation>
  }
}

Heap.propTypes = {
  src: PropTypes.string.isRequired,
  className: PropTypes.string,

  basePath: PropTypes.string,

  navigation: PropTypes.shape({
    push: PropTypes.func.isRequired,
    replace: PropTypes.func.isRequired
  }),
  currentCardPath: PropTypes.string
}

export default Heap
