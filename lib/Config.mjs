/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import crypto from 'crypto'
import fs from 'fs'
import kebabCase from 'lodash/kebabCase'
import pick from 'lodash/pick'
import luxon from 'luxon'
import path from 'path'
import sharp from 'sharp'
import { Log } from './Log'

const { readFile, writeFile, copyFile } = fs.promises
const { DateTime } = luxon

const dateTime = ({ date }) => DateTime.fromISO(date)

async function resize (longSide, cdnPrefix, fromPath, toPath, width, height) {
  // nothing to do
  if (longSide > width && longSide > height) return null

  let targetWidth, targetHeight
  if (width > height) {
    targetWidth = longSide
    targetHeight = Math.floor(longSide * height / width)
  } else {
    targetHeight = longSide
    targetWidth = Math.floor(longSide * width / height)
  }

  try {
    return sharp(fromPath)
      .withMetadata()
      .resize(targetWidth, targetHeight)
      .toFile(toPath)
      .then(() => ({
        src: `${cdnPrefix}${path.parse(toPath).base}`,
        width: targetWidth
      }))
  } catch (error) {
    Log.error(`Error resizing image [from=${fromPath}, to=${toPath}, size=${longSide}]`, error)
    process.exit(-1)
  }
}

async function exportImage (
  targetDir,
  { filePath: imageRelativePath, width, height },
  { config, sizes, cdnPrefix }
) {
  Log.info(`Exporting image ${imageRelativePath}...`)
  const imagePath = path.resolve(path.dirname(config), imageRelativePath)
  const md5 = crypto.createHash('md5').update(await readFile(imagePath)).digest('hex')
  const { ext, name } = path.parse(imagePath)

  const promises = []
  for (let sizeStr of sizes.split(',')) {
    const size = parseInt(sizeStr)
    // Use the md5 from the original file for all the sizes to avoid calculating it on each file.
    // The smaller files are all tied to the content of the larger file so if ti changes, they'll
    // all get a new cache-busting hash.
    const toPath = path.normalize(`${targetDir}/${name}-${size}-${md5}${ext}`)
    promises.push(resize(size, cdnPrefix, imagePath, toPath, width, height))
  }

  const copyToPath = path.normalize(`${targetDir}/${name}-original-${md5}${ext}`)
  promises.push(copyFile(imagePath, copyToPath).then(() => ({
    src: `${cdnPrefix}${path.parse(copyToPath).base}`,
    width: width
  })))

  return Promise.all(promises).then(sources => sources.filter(source => source != null))
}

async function readFileContents (filePath, { nullOnMissing = false } = {}) {
  try {
    return await readFile(filePath)
  } catch (error) {
    if (error.code === 'ENOENT' && nullOnMissing) return null

    Log.error('Caught unexpected error reading file', error)
    process.exit(-1)
  }
}

async function exportCard (card, targetDir, args) {
  switch (card.cardType) {
    case 'photo': {
      const cardMeta = pick(card, ['cardType', 'path', 'width', 'height', 'meta'])
      if (args.jsonOnly) return cardMeta

      const sources = args.jsonOnly ? null : await exportImage(targetDir, card, args)
      return { ...cardMeta, sources }
    }

    case 'title': {
      const { descriptionFile } = card
      if (descriptionFile != null) {
        Log.info(`Reading title description file ${descriptionFile}`)
        const filePath = path.resolve(path.dirname(args.config), descriptionFile)
        const description = await readFileContents(filePath)
        return {
          ...pick(card, ['cardType', 'path', 'title']),
          description: description && description.toString()
        }
      } else {
        return pick(card, ['cardType', 'path', 'title'])
      }
    }

    default:
      return { ...card }
  }
}

export default class Config {
  static async read ({ config }, createEmpty = true) {
    Log.info(`Reading config from ${config}...`)

    const contents = await readFileContents(config, { nullOnMissing: true })
    if (contents == null) {
      if (createEmpty) {
        Log.info('Config file does not exist, starting with an empty config.')
        return new Config(config)
      } else {
        Log.error('Config file missing!', config)
        process.exit(-1)
      }
    }

    return new Config(config, JSON.parse(contents))
  }

  /**
   * Adds an image to an export config. Does not do any sorting - it is expected that images are
   * added in the order in which they were specified in the original
   *
   * @returns The updated export config - the original is not modified.
   */
  static async addCardForExport (exportConfig, card, targetDir, args, existingConfig) {
    const { jsonOnly } = args
    const { cards = [] } = exportConfig
    let existingCard = {}
    if (jsonOnly) {
      existingCard = existingConfig.cards.find(({ path }) => card.path === path)
    }
    return {
      ...exportConfig,
      cards: [ ...cards, { ...existingCard, ...(await exportCard(card, targetDir, args)) }]
    }
  }

  static setArchiveUrl (exportConfig, archiveUrl) {
    return { ...exportConfig, archiveUrl }
  }

  constructor (configPath, json) {
    this.path = configPath
    // take the name of the current directory if no name is given.
    this.name = (json && json.name) ||
      path.dirname(path.relative('/', configPath)).split(path.sep).pop()
    this.copyright = json && json.copyright || ''
    this.copyrightCovers = json && json.copyrightCovers || []
    this.cards = []
    this.imagesDateSorted = true

    if (json != null) {
      if (json.cards != null) {
        this.cards = [...json.cards]
      }
      this.imagesDateSorted = this.photos
        .reduce(
          ({ areSorted, previous }, image) => !areSorted
            ? { areSorted }
            : {
              areSorted: previous == null || dateTime(image) > dateTime(previous),
              previous: image
            },
          true
        )
    }
  }

  get photos () {
    return this.cards.filter(({ cardType }) => cardType === 'photo')
  }

  async write () {
    Log.info(`Writing config to ${this.path}...`)

    // make the local config human readable so it's easier to futz with by hand.
    const fileContent = JSON.stringify({
      name: this.name,
      copyright: this.copyright,
      copyrightCovers: this.copyrightCovers,
      cards: this.cards
    }, null, 2)

    try {
      return writeFile(this.path, fileContent)
    } catch (error) {
      Log.error('Caught error writing config', error)
      process.exit(-1)
    }
  }

  /**
   * Returns a JSON object without the cards array that can be used with the current version of
   * the <Heap/> component.
   */
  toExportConfig (existingConfig) {
    const { archiveUrl } = existingConfig || {}
    return {
      name: this.name,
      copyright: this.copyright,
      copyrightCovers: this.copyrightCovers,
      archiveUrl
    }
  }

  addImage (exifTags, filePath) {
    const {
      DateTimeOriginal,
      ImageWidth: width,
      ImageHeight: height,
      Title: title,
      Description: description,
      Copyright: copyright
    } = exifTags

    let imagePath = kebabCase(title == null ? path.parse(filePath).name : title)
    const collisions = this.photos.reduce((collisions, { path: existingPath }) => [
      ...collisions,
      ...(existingPath.startsWith(imagePath) ? [existingPath] : [])
    ], [])
    if (collisions.length > 0) {
      const originalPath = imagePath
      let added = 1
      while (collisions.includes(imagePath)) {
        // find a name that isn't a collision.
        imagePath = `${originalPath}-${++added}`
      }
    }

    // These aren't actually UTC - they're un-zoned. By setting the timezone to UTC we can more
    // easily ignore the lack of timezone info
    const date = DateTime.fromObject({ ...DateTimeOriginal, zone: 'UTC' }).toISO().split('.')[0]
    const image = {
      cardType: 'photo',
      filePath,
      path: imagePath,
      date,
      width,
      height,
      meta: { title, description, copyright }
    }

    const index = this.photos.findIndex(({ filePath }) => filePath === image.filePath)
    if (index >= 0) {
      // Skipping instead of overwriting so that by-hand edits in the json don't get wiped out.
      // If a re-import is desired, remove the entries from the json and re-run the import command.
      Log.warning('Skipping existing image in config', image.filePath)
      return
    }

    if (!this.imagesDateSorted) {
      // if we're not date sorting, just stuff the new one at the end
      this.cards = [...this.cards, image]
    } else {
      const index = this.cards.findIndex(
        ({ date }) => date != null && dateTime(image) < dateTime({ date })
      )
      if (index < 0) this.cards = [...this.cards, image]
      else this.cards = [...this.cards.slice(0, index), image, ...this.cards.slice(index)]
    }
  }
}
