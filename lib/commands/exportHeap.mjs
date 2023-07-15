/**
 * Copyright (c) 2018-2019 Nathan Curtis
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
import { readRemoteConfig, syncToAWS } from '../AWSSync'
import Config, { readLocalConfig } from '../Config'
import { Log, setVerbose } from '../Log'
import { getMd5 } from '../util'

const { mkdtemp, writeFile, rename: moveFile, stat } = fs.promises

async function exportHeap (args) {
  const { verbose, cdnPrefix, awsPath, awsBucket, config: configPath } = args
  setVerbose(verbose)

  if (awsBucket == null || awsPath == null) {
    Log.error('aws-bucket and aws-path are required!')
    process.exit(-1)
  }

  async function createTempDir () {
    try {
      return mkdtemp(path.join(os.tmpdir(), 'heap-images-'))
    } catch (error) {
      Log.error(`Cannot create temp dir`, error)
      process.exit(-1)
    }
  }

  async function exportConfigJSON (exportJSON, targetDir) {
    const targetFile = path.normalize(`${targetDir}/${path.parse(configPath).base}`)
    Log.info('Writing config to', targetFile)

    try {
      return writeFile(targetFile, JSON.stringify(exportJSON))
    } catch (error) {
      Log.error('Caught error writing export config', error)
      process.exit(-1)
    }
  }

  async function createPhotoZip (targetDir, config) {
    const { cards, name } = config
    Log.info('Creating photo zip archive...')

    const nameForFiles = kebabCase(name)
    const filePaths = cards
      .filter(({ cardType }) => cardType === 'photo')
      .map(({ filePath }) => filePath)
    const archiveName = `${nameForFiles}.tar.gz`
    const archivePath = path.normalize(`${targetDir}/${archiveName}`)
    await promisify(exec)(`(
      cd ${path.dirname(`/${path.relative('/', config)}`)} &&
      tar \
      -c${verbose ? 'v' : ''} \
      ${filePaths.join(' ')} | \
      gzip -n > ${archivePath}
    )`)

    // our zip can be larger than the maximum size of a Buffer, so do MD5 with a stream instead
    const md5 = await getMd5(archivePath)
    const assetName = `${nameForFiles}-${md5}.tar.gz`
    await moveFile(archivePath, path.normalize(`${targetDir}/${assetName}`))

    return assetName
  }

  const targetDir = await createTempDir()
  Log.info('Writing to temp dir', targetDir)

  const localConfig = await readLocalConfig(configPath)
  const remoteConfig = await readRemoteConfig(awsBucket, awsPath, configPath)
  let existingConfig = null
  let exportConfig = localConfig.toExportConfig(existingConfig)
  for (let card of localConfig.cards) {
    exportConfig = await Config.addCardForExport(
      exportConfig, card, targetDir, args, existingConfig
    )
  }
  const archive = await createPhotoZip(targetDir, localConfig)
  const { size } = await stat(path.normalize(`${targetDir}/${archive}`))
  exportConfig = Config.setArchiveUrl(
    exportConfig,
    `${cdnPrefix}${archive}`,
    size
  )

  await exportConfigJSON(exportConfig, targetDir)

  if (awsBucket != null) {
    await syncToAWS(args, targetDir)
  }

  Log.feedback('\nExport complete!\n')
}

// Yargs command definition
export const command = 'export'
export const describe = 'Export heap'
export const builder = yargs => {
  yargs.options({
    sizes: {
      describe: 'Sizes of image on the long side to build for the image srcsets',
      // Based on current popular screen resolution widths
      default: '500,1366,1920,3840'
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
    }
  })
  yargs.positional('cdn-prefix', {
    describe: 'A prefix for all of the image paths to indicate the public URL that the image ' +
      'will be hosted at.'
  })
}
export const handler = exportHeap
