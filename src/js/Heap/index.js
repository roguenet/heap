/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import React from 'react'
import HeapComponent, { HEAP_SHAPE } from './Heap'
import HeapLoader from './HeapLoader'
import Navigation from './Navigation'

const HeapWithConfig = props => {
  const { config, className, children } = props
  if (props.navigation != null) {
    const { navigation, currentCardPath } = props
    return <HeapComponent {...{ config, className, navigation, currentCardPath, children }} />
  } else {
    return <Navigation basePath={props.basePath}>{ ({ navigation, currentCardPath }) =>
      <HeapComponent {...{ config, className, navigation, currentCardPath, children }} />
    }</Navigation>
  }
}

const Heap = props => {
  const { src, heap } = props
  const childProps = { ...props, src: undefined, heap: undefined }
  if (heap != null) {
    return <HeapWithConfig config={heap} {...childProps} />
  } else if (src != null) {
    return <HeapLoader src={src}>{
      config => <HeapWithConfig config={config} {...childProps} />
    }</HeapLoader>
  } else {
    console.error('Required prop missing! [src or config is required]')
    return null
  }
}

Heap.propTypes = {
  // One of src or heap is required
  src: PropTypes.string,
  heap: HEAP_SHAPE,

  className: PropTypes.string,

  basePath: PropTypes.string,

  navigation: PropTypes.shape({
    push: PropTypes.func.isRequired,
    replace: PropTypes.func.isRequired
  }),
  currentCardPath: PropTypes.string
}

export default Heap
