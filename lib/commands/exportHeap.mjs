/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { exec } from 'child_process'
import fs from 'fs'
import kebabCase from 'lodash/kebabCase'
import os from 'os'
import path from 'path'
import { promisify } from 'util'
import { readCurrentConfig, syncToAWS } from '../AWSSync'
import Config from '../config'
import { Log, setVerbose } from '../Log'
import { getMd5 } from '../util'

const { access, mkdir, mkdtemp, writeFile, rename: moveFile, stat } = fs.promises

async function exportHeap (args) {
  setVerbose(args.verbose)

  if (args.toDir == null && args.awsBucket == null) {
    Log.error('Either to-dir or aws-bucket is required!')
    process.exit(-1)
  }
  if (args.toDir != null && args.awsBucket != null) {
    Log.error('Cannot use both to-dir and aws-bucket!')
    process.exit(-1)
  }

  if (args.awsBucket != null && args.awsPath == null) {
    Log.error('When using AWS S3 via aws-bucket and aws-path!')
    process.exit(-1)
  }

  async function createToDir () {
    const { toDir } = args
    try {
      await mkdir(toDir)
    } catch (error) {
      Log.error('Error creating to-dir', error)
      process.exit(-1)
    }
  }

  async function ensureTargetDir () {
    const { toDir } = args
    try {
      if (toDir != null) {
        await access(toDir, fs.constants.W_OK)
        return toDir
      } else {
        // if toDir isn't specified, we want to create a temporary dir.
        return mkdtemp(path.join(os.tmpdir(), 'heap-images-'))
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        Log.info('To-dir does not exist, creating now.')
        await createToDir({ toDir })
        return toDir
      }

      Log.error(`Cannot access to-dir ${toDir}`, error)
      process.exit(-1)
    }
  }

  async function exportConfigJSON (exportJSON, targetDir) {
    const targetFile = path.normalize(`${targetDir}/${path.parse(args.config).base}`)
    Log.info('Writing config to', targetFile)

    try {
      return writeFile(targetFile, JSON.stringify(exportJSON))
    } catch (error) {
      Log.error('Caught error writing export config', error)
      process.exit(-1)
    }
  }

  async function createPhotoZip (targetDir, { cards, name }) {
    Log.info('Creating photo zip archive...')

    const nameForFiles = kebabCase(name)
    const filePaths = cards
      .filter(({ cardType }) => cardType === 'photo')
      .map(({ filePath }) => filePath)
    const archiveName = `${nameForFiles}.tar.gz`
    const archivePath = path.normalize(`${targetDir}/${archiveName}`)
    await promisify(exec)(`(
      cd ${path.dirname(`/${path.relative('/', args.config)}`)} &&
      tar \
      -c${args.verbose ? 'v' : ''} \
      ${filePaths.join(' ')} | \
      gzip -n > ${archivePath}
    )`)

    // our zip can be larger than the maximum size of a Buffer, so do MD5 with a stream instead
    const md5 = await getMd5(archivePath)
    const assetName = `${nameForFiles}-${md5}.tar.gz`
    await moveFile(archivePath, path.normalize(`${targetDir}/${assetName}`))

    return assetName
  }

  const targetDir = await ensureTargetDir()
  Log.info('Writing to target dir', targetDir)

  const config = await Config.read(args, false)
  let existingConfig = null
  if (args.jsonOnly) {
    existingConfig = await readCurrentConfig(args)
  }
  let exportConfig = config.toExportConfig(existingConfig)
  for (let card of config.cards) {
    exportConfig = await Config.addCardForExport(
      exportConfig, card, targetDir, args, existingConfig
    )
  }
  if (!args.jsonOnly) {
    const archive = await createPhotoZip(targetDir, config)
    const { size } = await stat(path.normalize(`${targetDir}/${archive}`))
    exportConfig = Config.setArchiveUrl(
      exportConfig,
      `${args.cdnPrefix}${archive}`,
      size
    )
  }

  await exportConfigJSON(exportConfig, targetDir)

  if (args.awsBucket != null) {
    await syncToAWS(args, targetDir)
  }

  Log.feedback('\nExport complete!\n')
}

// Yargs command definition
export const command = 'export <cdn-prefix>'
export const describe = 'Export heap'
export const builder = yargs => {
  yargs.options({
    sizes: {
      describe: 'Sizes of image on the long side to build for the image srcsets',
      // Based on current popular screen resolution widths
      default: '500,1366,1920,3840'
    },
    'to-dir': {
      describe: 'A directory to write the export files to. One of to-dir or aws-bucket is ' +
        'required.'
    },
    'aws-bucket': {
      describe: 'Uses credentials from the environment (AWS_PROFILE) to send the exported heap ' +
        'to the given bucket. With this argument, a temporary directory is used to stage the ' +
        'export, and then the contents are synced to the given bucket. BEWARE: any files not ' +
        'resulting from this export that are in the target bucket WILL BE DELETED. One of ' +
        'aws-bucket or to-dir is required'
    },
    'aws-path': {
      describe: 'The path for the files from this heap in the aws bucket. Required if aws-bucket ' +
        'is used.'
    },
    'json-only': {
      alias: 'j',
      boolean: true,
      default: false,
      describe: 'Currently only valid in AWS mode. Exports the updates to the JSON file only. ' +
        'Does not resize and export images, or create a new archive file. Downloads the existing ' +
        'json from amazon and merges in changes in meta information from the local config'
    }
  })
  yargs.positional('cdn-prefix', {
    describe: 'A prefix for all of the image paths to indicate the public URL that the image ' +
      'will be hosted at.'
  })
}
export const handler = exportHeap
