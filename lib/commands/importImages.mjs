/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import exif from 'exiftool-vendored'
import fs from 'fs'
import path from 'path'
import {
  addPhotoCard,
  logConfig,
  photoExists,
  photos,
  readLocalConfig,
  writeLocalConfig
} from '../Config'
import { Log, setVerbose } from '../Log'
import { readExif } from '../util'

const { readdir: readDir } = fs.promises
const { exiftool } = exif

const SUPPORTED_TYPES = ['.jpg']

const isSupportedType = filename =>
  SUPPORTED_TYPES.includes(path.parse(filename).ext.toLowerCase())

async function importImages (args) {
  const { verbose, config: configPath } = args
  setVerbose(verbose)

  async function getImagePaths () {
    const { config, fromDir } = args
    Log.info(`Importing images from ${fromDir}`)

    try {
      const files = await readDir(fromDir, { withFileTypes: true })
      return files
        .filter(file => file.isFile() && isSupportedType(file.name))
        .map(({ name }) => ({
          relative: path.relative(path.dirname(config), `${fromDir}/${name}`),
          absolute: `/${path.relative('/', `${fromDir}/${name}`)}`
        }))
    } catch (error) {
      Log.error('Caught unexpected error reading from-dir', error)
      process.exit(-1)
    }
  }

  const localConfig = await readLocalConfig(configPath)
  const photoCards = photos(localConfig)
  const doesNotExist = ({ relative }) => {
    const skip = photoExists(photoCards, relative)
    if (skip) Log.warning('Skipping existing image in config', relative)
    return !skip
  }
  const addExif = paths => readExif(paths.absolute).then(exif => ({ ...paths, exif }))
  const getImageData = () => getImagePaths()
    .then(paths => paths.filter(doesNotExist).map(addExif))
    .then(promises => Promise.all(promises))

  const config = (await getImageData()).reduce(
    (config, { relative, exif }) => addPhotoCard(config, exif, relative),
    localConfig
  )
  exiftool.end()

  await writeLocalConfig(config, configPath)
  Log.feedback(`\nImage import complete!`)
  logConfig(config, configPath)
}

// Yargs command definition
export const command = 'import <from-dir>'
export const describe = 'Import images into the active config.'
export const builder = yargs => {
  yargs.positional('from-dir', {
    describe: 'The directory to read images from'
  })
}
export const handler = importImages
