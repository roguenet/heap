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
import { Log } from './Log'
import { generateImagePreview, getMd5, readFileContents, resize } from './util'

const { writeFile, copyFile, stat } = fs.promises
const { DateTime } = luxon

const PROPS = {
  config: {
    local: ['name', 'copyright', 'copyrightCovers'],
    remote: ['name', 'copyright', 'copyrightCovers', 'archiveUrl', 'archiveSize']
  },

  photo: {
    local: ['cardType', 'path', 'filePath', 'date', 'width', 'height', 'meta'],
    remote: ['cardType', 'path', 'width', 'height', 'meta', 'sources', 'preview']
  },

  title: {
    local: ['cardType', 'path', 'title', 'descriptionFile'],
    remote: ['cardType', 'path', 'title', 'description']
  }
}

const createEmptyConfig = configPath => ({
  name: path.dirname(path.relative('/', configPath)).split(path.sep).pop(),
  copyright: '',
  copyrightCovers: [],
  cards: [],
  imagesDateSorted: true
})

const dateTime = ({ date }) => DateTime.fromISO(date)

/**
 * Filters the photo cards from the given config.
 *
 * @param config Config to pull photo cards from
 */
export const photos = config => config.cards.filter(({ cardType }) => cardType === 'photo')

/**
 * Returns true if the given array of photo cards contains the photo given.
 *
 * @param photos Array of photo cards to search
 * @param imageFilePath Image file path to look for
 */
export const photoExists = (photos, imageFilePath) =>
  photos.findIndex(({ filePath }) => filePath === imageFilePath) >= 0

/**
 * Export an image to the target directory.
 *
 * @param targetDir Directory to write the resulting images to.
 * @param card The photo card that describes the image.
 * @param args The command arguments.
 * @returns Promise that resolves to the sources array for the resulting images.
 */
async function exportImage (targetDir, card, args) {
  const { filePath: imageRelativePath, width, height } = card
  const { config, sizes, cdnPrefix } = args
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
    // TODO: don't pass CDN prefix, instead, add here at the end of the process
    // src: `${cdnPrefix}${path.parse(toPath).base}`,
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

/**
 * Export a card to the target directory.
 *
 * @param card The card to export
 * @param targetDir The target directory
 * @param args The command args
 * @returns Promise that resolves to the complete card definition.
 */
async function exportCard (card, targetDir, args) {
  const { config, jsonOnly } = args

  switch (card.cardType) {
    case 'photo': {
      const cardMeta = pick(card, ['cardType', 'path', 'width', 'height', 'meta'])
      if (jsonOnly) return cardMeta

      const sources = await exportImage(targetDir, card, args)

      const { filePath, width, height } = card
      const filename = path.resolve(path.dirname(config), filePath)
      const preview = await generateImagePreview(filename, width, height)
      return { ...cardMeta, sources, preview }
    }

    case 'title': {
      const { descriptionFile } = card
      if (descriptionFile != null) {
        Log.info(`Reading title description file ${descriptionFile}`)
        const filePath = path.resolve(path.dirname(config), descriptionFile)
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

/**
 * Read an existing local config file from the filesystem.
 *
 * @param configPath The path to the local config files.
 * @param createEmpty If true, an empty config will be created when there is no file present
 */
export async function readLocalConfig (configPath, createEmpty = true) {
  Log.info(`Reading config from ${configPath}...`)

  const configBuffer = await readFileContents(configPath, { nullOnMissing: true })
  if (configBuffer == null) {
    if (createEmpty) {
      Log.info('Config file does not exist, starting with an empty config.')
      return createEmptyConfig(configPath)
    } else {
      Log.error('Config file missing!', configPath)
      process.exit(-1)
    }
  }

  const config = JSON.parse(configBuffer)
  config.imagesDateSorted = photos(config).reduce(
    ({ areSorted, previous }, image) => !areSorted
      ? { areSorted }
      : { areSorted: previous == null || dateTime(image) > dateTime(previous), previous: image },
    { areSorted: true }
  ).areSorted

  return config
}

/**
 * Writes the config to the given local path, filtering for properties that are appropriate for the
 * local config, and formatting the file so that it's easy to edit.
 * @param config The config object to write
 * @param path The path to write the config to.
 * @returns A promise of catching errors fro m teh write process.
 */
export async function writeLocalConfig (config, path) {
  Log.info(`Writing config to ${path}...`)

  // make the local config human readable so it's easier to futz with by hand.
  const fileContent = JSON.stringify(
    {
      ...pick(config, PROPS.config.local),
      cards: config.cards.map(card => pick(card, PROPS[card.cardType].local))
    },
    null,
    2
  )

  try {
    return writeFile(path, fileContent)
  } catch (error) {
    Log.error('Caught error writing config', error)
    process.exit(-1)
  }
}

export function addPhotoCard (config, exifTags, filePath) {
  const {
    DateTimeOriginal,
    ImageWidth: width,
    ImageHeight: height,
    Title: title,
    Description: description,
    Copyright: copyright
  } = exifTags

  let imagePath = kebabCase(title == null ? path.parse(filePath).name : title)
  const photoCards = photos(config)
  const collisions = photoCards.reduce((collisions, { path: existingPath }) => [
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

  if (photoExists(photoCards, image.filePath)) {
    // Skipping instead of overwriting so that by-hand edits in the json don't get wiped out.
    // If a re-import is desired, remove the entries from the json and re-run the import command.
    Log.warning('Skipping existing image in config', image.filePath)
    return config
  }

  const photoIndex = config.imagesDateSorted
    ? config.cards.findIndex(({ date }) => date != null && dateTime(image) < dateTime({ date }))
    // if we're not date sorting, just stuff the new one at the end
    : -1

  const cards = photoIndex < 0
    ? [...config.cards, image]
    : [...config.cards.slice(0, photoIndex), image, ...config.cards.slice(photoIndex)]

  return { ...config, cards }
}

export default class Config {
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
}
