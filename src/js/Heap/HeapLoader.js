/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import PropTypes from 'prop-types'
import { Component } from 'react'

export default class HeapLoader extends Component {
  static propTypes = {
    src: PropTypes.string.isRequired,
    children: PropTypes.func.isRequired
  }

  state = {
    config: null
  }

  componentDidMount () {
    this.loadHeapJson().catch(error => { console.log('Error loading json', error) })
  }

  async loadHeapJson () {
    this.setState({ config: await (await window.fetch(this.props.src)).json() })
  }

  render () {
    return this.state.config && this.props.children(this.state.config)
  }
}
