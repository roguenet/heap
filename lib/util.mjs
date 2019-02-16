/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import crypto from 'crypto'
import exif from 'exiftool-vendored'
import fs from 'fs'
import sharp from 'sharp'
import sqip from 'sqip'
import { Log } from './Log'

const { readFile, stat } = fs.promises
const { exiftool } = exif

/**
 * Calculates the MD5 of a given file using a file stream (suitable for large files).
 *
 * @param filename The file to calculate for
 * @returns A Promise that resolves to the hex MD5 value for the file.
 */
export function getMd5 (filename) {
  return new Promise(resolve => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filename)
    stream.on('readable', () => {
      const data = stream.read()
      if (data == null) resolve(hash.digest('hex'))
      else hash.update(data)
    })
  })
}

/**
 * Takes a goal longSize length and writes out a rized copy of an image, returning a structure
 * that reflects the written image parameters
 *
 * @param longSide A number indicating the length to resize to
 * @param fromPath The file path of the source
 * @param toPath The file path of the destination
 * @param width Width of the source image
 * @param height Height of the source image
 * @returns Promise that resolves to { width (width of resized image), size (size of final image in
 * bytes) }
 */
export async function resize (longSide, fromPath, toPath, width, height) {
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
        width: targetWidth,
        size: size
      }))
  } catch (error) {
    Log.error(`Error resizing image [from=${fromPath}, to=${toPath}, size=${longSide}]`, error)
    process.exit(-1)
  }
}

/**
 * Generates an SVG image preview using sqip.
 *
 * @param filename The source image filename
 * @param width Width of the source image
 * @param height Height of the source image
 * @param numberOfPrimitives The number of SVG shapes to use to represent this image.
 * @returns A Base64 representation of a preview SVG for this image.
 */
export function generateImagePreview (filename, width, height, { numberOfPrimitives = 50 } = {}) {
  const { final_svg: preview } = sqip({ filename, blur: 0, mode: 1, numberOfPrimitives })
  return Buffer
    // The toolchain used here does not always do a correct job of having the background cover the
    // entire image, so replace the commands on the first path with one that will cover it all.
    .from(preview.replace(/d="[^"]*"/, `d="M0 0h${width}v${height}H0z"`))
    .toString('base64')
}

/**
 * Reads the file contents, with the option to return null if the file is missing instead of
 * generating an error.
 *
 * @param filePath The file path to read
 * @param nullOnMissing If true, null is returned when the file is missing. Otherwise, an error
 * is generated and the process exits
 * @returns Returns a promise that resolves to the Buffer contents of the file.
 */
export async function readFileContents (filePath, { nullOnMissing = false } = {}) {
  try {
    return await readFile(filePath)
  } catch (error) {
    if (error.code === 'ENOENT' && nullOnMissing) return null

    Log.error('Caught unexpected error reading file', error)
    process.exit(-1)
  }
}

/**
 * Reads the exif data on the given image. It's assumed that the file is of a valid image type.
 *
 * @param filePath The image file path to read
 * @returns Returns a promise that resolves to the exif data for the given image
 */
export async function readExif (filePath) {
  Log.info(`Reading EXIF data on ${filePath}...`)

  try {
    return exiftool.read(filePath)
  } catch (error) {
    Log.error('Caught error processing image', error)
    process.exit(-1)
  }
}
