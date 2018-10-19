/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import exif from 'exiftool-vendored'
import fs from 'fs'
import path from 'path'
import Config from '../Config'
import { Log, setVerbose } from '../Log'

const { readdir: readDir } = fs.promises
const { exiftool } = exif

const SUPPORTED_TYPES = ['.jpg']

const isSupportedType = filename =>
  SUPPORTED_TYPES.includes(path.parse(filename).ext.toLowerCase())

async function readImage (image) {
  Log.info(`Reading EXIF data on ${image}...`)

  try {
    return exiftool.read(image)
  } catch (error) {
    Log.error('Caught error processing image', error)
    process.exit(-1)
  }
}

async function importImages (args) {
  setVerbose(args.verbose)

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

  const config = await Config.read(args)

  for (let { absolute, relative } of await getImagePaths()) {
    config.addImage(await readImage(absolute), relative)
  }
  exiftool.end()

  await config.write()
  Log.feedback(`\nImage import complete! config: ${args.config}\n`)
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
