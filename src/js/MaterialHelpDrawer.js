/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import Button from '@material-ui/core/Button'
import { createGenerateClassName } from '@material-ui/core/styles'
import Tooltip from '@material-ui/core/Tooltip'
import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import ArrowForwardIcon from '@material-ui/icons/ArrowForward'
import CloseIcon from '@material-ui/icons/Close'
import FirstPageIcon from '@material-ui/icons/FirstPage'
import HelpIcon from '@material-ui/icons/HelpOutline'
import LastPageIcon from '@material-ui/icons/LastPage'
import MoreIcon from '@material-ui/icons/MoreVert'
import ArchiveDownloadIcon from '@material-ui/icons/PhotoLibraryOutlined'
import ImageDownloadIcon from '@material-ui/icons/PhotoOutlined'
import isString from 'lodash/isString'
import PropTypes from 'prop-types'
import React, { Component, Fragment } from 'react'
import JssProvider from 'react-jss/lib/JssProvider'
import styled from 'styled-components'
import { UseTheme } from './Theme'

// A hack to prevent icons here and icons from our consumer to have clashing class names.
// https://material-ui.com/customization/css-in-js/#creategenerateclassname-options-class-name-generator
const generateClassName = createGenerateClassName({ productionPrefix: 'c' })

const Divider = styled.div`
  border-right: 1px solid black;
  margin: 4px;
`

const StyledControlDrawer = styled.div`
  position: fixed;
  margin: 10px;
  left: 0;
  bottom: 0;
  display: flex;
  justify-content: flex-start;
  padding: 10px;
  border-radius: 37px;
  
  transition: background 350ms ease-out;
  background: ${({ active, theme }) => active ? theme.drawerBackground : 'none'};
`

const StyledHelpPanel = styled.div`
  position: fixed;
  margin: 10px;
  left: 0;
  top: 0;
  width: 500px;
  padding: ${({ active }) => active ? '24px' : '10px'};
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ active, theme }) => active ? `2px 2px 10px ${theme.dropShadow}` : 'none'};
  background: ${({ theme }) => theme.lightBoxBackground};
  
  transition: background 350ms ease-out;
  background: ${({ active }) => active ? 'white' : 'none'};
  
  .heap-lightBoxTitle {
    margin-top: 8px;
    text-align: center;
  }
`

const StyledButton = styled(Button)`
  && {
    margin: 0 8px 2px 8px;
    flex-shrink: 0;
    
    &:first-child {
      margin-left: 4px;
    }
    &:last-child {
      margin-right: 4px;
    }
  }
`

const DrawerButton = ({ disabled, onClick, children, tooltip, style }) => {
  const button = <StyledButton
    disabled={disabled}
    variant='fab'
    mini
    onClick={onClick}
    style={style}
  >
    { children }
  </StyledButton>

  return disabled || tooltip == null ? button : <Tooltip title={tooltip}>{ button }</Tooltip>
}

const InlineMoreIcon = styled(MoreIcon)`
  position: relative;
  top: 7px;
  border: 1px solid gray;
  border-radius: 16px;
`

const HelpPanel = ({ imagesCopyright, additionalControlsHelp }) => <Fragment>
  <div className='heap-lightBoxTitle'>Welcome to Heap!</div>
  <div className='heap-lightBoxDescription'>
    <p>
      This is a Heap photo album. Heap is designed to tell stories through photos
      and text. Heap is free software that anybody can install and use on their own website
      (link TODO).
    </p>
    Controls for this Heap:
    <ul>
      <li>Click anywhere to advance to the next photo.</li>
      <li>Use the browser back button to go back to the previous photo.</li>
      <li>
        Press the <InlineMoreIcon /> icon below to open a control drawer
        <ul>
          <li>The first set of buttons move forward and backward in the story you're viewing.</li>
          <li>
            The second set of buttons can be used to download the current image or the entire album
            of hi-res originals!
          </li>
          { additionalControlsHelp && additionalControlsHelp.map(
            (help, index) => <li key={index}>{ help }</li>
          ) }
        </ul>
      </li>
    </ul>
    <p>Enjoy!</p>
  </div>
  <sub>Heap &copy; 2018-2019 Nathan Curtis</sub>
  { imagesCopyright && <sub>All Images &copy; { imagesCopyright }</sub> }
</Fragment>

const sizeString = size => ['B', 'KB', 'MB', 'GB', 'TB'].reduce((value, label) => {
  if (isString(value)) return value

  if (value > 1024 * 0.8) return value / 1024
  else if (value > 100) return `${Math.round(value)} ${label}`
  else if (value > 10) return `${value.toFixed(1)} ${label}`
  else return `${value.toFixed(2)} ${label}`
}, size)

export default class MaterialHelpDrawer extends Component {
  static propTypes = {
    navigate: PropTypes.shape({
      first: PropTypes.func.isRequired,
      back: PropTypes.func.isRequired,
      forward: PropTypes.func.isRequired,
      last: PropTypes.func.isRequired
    }).isRequired,

    cardContext: PropTypes.shape({
      config: PropTypes.shape({
        copyright: PropTypes.string
      }).isRequired,
      card: PropTypes.object,
      isFirst: PropTypes.bool,
      isLast: PropTypes.bool
    }).isRequired,

    additionalControls: PropTypes.arrayOf(PropTypes.shape({
      onClick: PropTypes.func.isRequired,
      icon: PropTypes.node.isRequired
    })),

    additionalControlsHelp: PropTypes.arrayOf(PropTypes.node)
  };

  state = {
    controlsActive: true,
    helpActive: false
  };

  swallowEvent = event => event.stopPropagation();

  toggleControlsActive = () => {
    this.setState({ controlsActive: !this.state.controlsActive })
  };

  toggleHelpActive = () => {
    this.setState({ helpActive: !this.state.helpActive })
  };

  downloadImage = () => {
    const { card: { cardType, sources } } = this.props.cardContext
    if (cardType !== 'photo') return

    window.location = sources[sources.length - 1].src
  };

  downloadArchive = () => {
    const { config: { archiveUrl } } = this.props.cardContext
    window.location = archiveUrl
  };

  render () {
    const { controlsActive, helpActive } = this.state
    const {
      navigate: { first, back, forward, last },
      cardContext: { config, card, isFirst, isLast },
      additionalControls,
      additionalControlsHelp
    } = this.props
    const isPhoto = card.cardType === 'photo'

    let downloadImageLabel = 'Download this image'
    const imageSize = isPhoto ? card.sources[card.sources.length - 1].size : null
    if (imageSize != null) downloadImageLabel = `${downloadImageLabel} (${sizeString(imageSize)}`

    let downloadArchiveLabel = 'Download entire archive'
    if (config.archiveSize != null) {
      downloadArchiveLabel = `${downloadArchiveLabel} (${sizeString(config.archiveSize)})`
    }

    return <UseTheme>{ theme =>
      <JssProvider generateClassName={generateClassName}>
        <Fragment>
          <StyledHelpPanel theme={theme} active={helpActive} onClick={this.swallowEvent}>
            <DrawerButton
              style={{ position: helpActive ? 'absolute' : null }}
              onClick={this.toggleHelpActive}
            >
              { helpActive ? <CloseIcon style={{ position: 'absolute' }} /> : <HelpIcon /> }
            </DrawerButton>
            { helpActive && <HelpPanel
              imagesCopyright={config.copyright}
              additionalControlsHelp={additionalControlsHelp}
            /> }
          </StyledHelpPanel>
          <StyledControlDrawer theme={theme} active={controlsActive} onClick={this.swallowEvent}>
            <DrawerButton tooltip='Toggle controls' onClick={this.toggleControlsActive}>
              <MoreIcon />
            </DrawerButton>
            { controlsActive && <Fragment>
              <Divider />
              <DrawerButton disabled={isFirst} onClick={first}><FirstPageIcon /></DrawerButton>
              <DrawerButton disabled={isFirst} onClick={back}><ArrowBackIcon /></DrawerButton>
              <DrawerButton disabled={isLast}
                onClick={forward}><ArrowForwardIcon /></DrawerButton>
              <DrawerButton disabled={isLast} onClick={last}><LastPageIcon /></DrawerButton>
              <Divider />
              <DrawerButton
                disabled={!isPhoto}
                onClick={this.downloadImage}
                tooltip={downloadImageLabel}
              >
                <ImageDownloadIcon />
              </DrawerButton>
              <DrawerButton
                onClick={this.downloadArchive}
                tooltip={downloadArchiveLabel}
              ><ArchiveDownloadIcon /></DrawerButton>
              { additionalControls && <Fragment>
                <Divider />
                { additionalControls.map(({ onClick, icon, tooltip }, index) => <DrawerButton
                  key={index}
                  onClick={onClick}
                  tooltip={tooltip}
                >{ icon }</DrawerButton>) }
              </Fragment> }
            </Fragment> }
          </StyledControlDrawer>
        </Fragment>
      </JssProvider>
    }</UseTheme>
  }
}
