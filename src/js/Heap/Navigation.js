/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import createHistory from 'history/createBrowserHistory'
import PropTypes from 'prop-types'
import { Component } from 'react'

const sanitizeBasePath = basePath => {
  if (!basePath.startsWith('/')) basePath = `/${basePath}`
  if (!basePath.endsWith('/')) basePath = `${basePath}/`
  return basePath
}

const getCurrentCardPath = pathname => {
  if (pathname == null || pathname.length < 2) return null
  pathname = pathname.substring(1)
  return pathname.includes('/') ? null : pathname
}

export default class Navigation extends Component {
  static propTypes = {
    basePath: PropTypes.string
  };

  static defaultProps = {
    basePath: '/'
  };

  history = createHistory({ basename: sanitizeBasePath(this.props.basePath) });

  state = {
    navigation: {
      push: cardPath => this.history.push(cardPath),
      replace: cardPath => this.history.replace(cardPath)
    },
    currentCardPath: getCurrentCardPath(this.history.location.pathname)
  };

  componentDidMount () {
    this.unlisten = this.history.listen(this.onHistoryChange)

    // Our child component can do a push or replace onMount, so our listener above might get
    // registered too late to hear about the first update.
    const currentCardPath = getCurrentCardPath(this.history.location.pathname)
    if (currentCardPath !== this.state.currentCardPath) this.setState({ currentCardPath })
  }

  componentWillUnmount () {
    this.unlisten()
  }

  onHistoryChange = ({ pathname }) => this.setState({
    currentCardPath: getCurrentCardPath(pathname)
  })

  render () {
    const { children } = this.props
    const { navigation, currentCardPath } = this.state
    return children({ navigation, currentCardPath })
  }
}
