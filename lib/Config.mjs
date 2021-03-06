/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs'
import kebabCase from 'lodash/kebabCase'
import pick from 'lodash/pick'
import luxon from 'luxon'
import path from 'path'
import sharp from 'sharp'
import sqip from 'sqip'
import { Log } from './Log'
import { getMd5 } from './util'

const { readFile, writeFile, copyFile, stat } = fs.promises
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
    // return await here so that our catch handles errors from sharp correctly
    return await sharp(fromPath)
      .withMetadata()
      .resize(targetWidth, targetHeight)
      .toFile(toPath)
      .then(() => stat(toPath).then(({ size }) => size))
      .then(size => ({
        src: `${cdnPrefix}${path.parse(toPath).base}`,
        width: targetWidth,
        size: size
      }))
  } catch (error) {
    Log.error(`Error resizing image [from=${fromPath}, to=${toPath}, size=${longSide}]`, error)
    process.exit(-1)
  }
}

function generateImagePreview ({ filePath: imageRelativePath, width, height }, { config }) {
  const { final_svg: preview } = sqip({
    filename: path.resolve(path.dirname(config), imageRelativePath),
    blur: 0,
    mode: 1,
    numberOfPrimitives: 50
  })
  return Buffer
    // The toolchain used here does not always do a correct job of having the background cover the
    // entire image, so replace the commands on the first path with one that will cover it all.
    .from(preview.replace(/d="[^"]*"/, `d="M0 0h${width}v${height}H0z"`))
    .toString('base64')
}

async function exportImage (
  targetDir,
  { filePath: imageRelativePath, width, height },
  { config, sizes, cdnPrefix }
) {
  Log.info(`Exporting image ${imageRelativePath}...`)
  const imagePath = path.resolve(path.dirname(config), imageRelativePath)
  const md5 = await getMd5(imagePath)
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
  const { size } = await stat(imagePath)
  promises.push(copyFile(imagePath, copyToPath).then(() => ({
    src: `${cdnPrefix}${path.parse(copyToPath).base}`,
    width: width,
    size
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

      const sources = await exportImage(targetDir, card, args)
      const preview = await generateImagePreview(card, args)
      return { ...cardMeta, sources, preview }
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
      if (existingCard == null && card.cardType === 'photo') {
        const imagePath = path.resolve(path.dirname(args.config), card.filePath)
        const { name } = path.parse(imagePath)
        // if our path was changed, try to find the image based on image name.
        existingCard = existingConfig.cards.find(
          ({ sources }) => path.parse(sources[0].src).name === name
        )

        // finally, if this is jsonOnly and a photo card and we didn't find an existing card, bail
        // on the process so we don't accidentally blow away sources on an existing card.
        if (existingCard == null) {
          throw new Error(`No existing card found for a photo card in jsonOnly mode ${card.path}]`)
        }
      }
    }
    return {
      ...exportConfig,
      cards: [...cards, { ...existingCard, ...(await exportCard(card, targetDir, args)) }]
    }
  }

  static setArchiveUrl (exportConfig, archiveUrl, archiveSize) {
    return { ...exportConfig, archiveUrl, archiveSize }
  }

  constructor (configPath, json) {
    this.path = configPath
    // take the name of the current directory if no name is given.
    this.name = (json && json.name) ||
      path.dirname(path.relative('/', configPath)).split(path.sep).pop()
    this.copyright = json && (json.copyright || '')
    this.copyrightCovers = json && (json.copyrightCovers || [])
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
    const { archiveUrl, archiveSize } = existingConfig || {}
    return {
      name: this.name,
      copyright: this.copyright,
      copyrightCovers: this.copyrightCovers,
      archiveUrl,
      archiveSize
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
