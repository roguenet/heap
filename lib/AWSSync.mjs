/**
 * Copyright (c) 2018-2023 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import S3 from 'aws-sdk/clients/s3'
import { exec } from 'child_process'
import fs from 'fs'
import camelCase from 'lodash/camelCase'
import isString from 'lodash/isString'
import upperFirst from 'lodash/upperFirst'
import mime from 'mime-types'
import path from 'path'
import { Writable, pipeline } from 'stream'
import { promisify } from 'util'
import { Log } from './Log'
import { getMd5 } from './util'

const { readdir: readDir } = fs.promises

const MULTIPART_CHUNK_SIZE = 50 * 1024 * 1024
const MAX_UPLOAD_TRIES = 3

// The JSON config should be fetched fresh every time a heap is loaded
const CONFIG_HEADERS = { 'Cache-Control': 'max-age=0' }
// The images are cache-busting with md5, so they should be cached forever.
const ASSET_HEADERS = file => ({
  'Cache-Control': 'max-age=315360000, public',
  'Content-Disposition': `attachment; filename=${
    // We don't have context on the pretty-print path name here, but we can at least get it
    // back to the original image filename
    path.parse(file).base.replace(/(-original)?-[a-z0-9]*\./, '.')
  }`
})

function getContentType (filename) {
  const mimeType = mime.lookup(filename) || 'application/octet-stream'
  const charset = mime.charset(mimeType)
  return isString(charset) ? `${mimeType}; charset=${charset.toLowerCase()}` : mimeType
}

/**
 * Resolves to an object with media and config lists that contain the filenames of those respective
 * file types that should be synced to S3.
 */
async function getFilePaths (dir) {
  try {
    return (await readDir(dir, { withFileTypes: true }))
      .filter(file => file.isFile())
      .reduce((files, { name }) => {
        // assume that everything that doesn't in .json is a media file, since this is a curated
        // temporary export directory
        const isConfig = path.parse(name).ext === '.json'
        const filePath = path.normalize(`${dir}/${name}`)
        return {
          ...files,
          ...(isConfig
            ? { configs: [...files.configs, filePath] }
            : { media: [...files.media, filePath] }
          )
        }
      }, { media: [], configs: [] })
  } catch (error) {
    Log.error('Caught unexpected error getting file list', error)
    process.exit(-1)
  }
}

async function shouldUpload (client, awsKey, etag) {
  // TODO List the bucket first and use the etags from that so we don't have to do a headObject
  // on every image individually.
  try {
    const { ETag } = await client.headObject({ Key: awsKey }).promise()
    return etag !== ETag
  } catch (error) {
    // file is missing
    if ([404, 403].includes(error.statusCode)) return true

    Log.error('Encountered error checking status of remote file', Log.blue(awsKey), error)
    process.exit(-1)
  }
}

async function uploadFile (client, bucketPath, file, headers) {
  const etag = `"${await getMd5(file)}"`
  const awsKey = path.normalize(`${bucketPath}/${path.parse(file).base}`)
  if (!(await shouldUpload(client, awsKey, etag))) {
    Log.info(Log.blue('Skipping file'), awsKey)
    return
  }

  Log.info('Uploading file', awsKey)
  const params = Object.entries(headers).reduce((params, [headerName, headerValue]) => ({
    ...params,
    [upperFirst(camelCase(headerName))]: headerValue
  }), {
    Key: awsKey,
    ACL: 'public-read',
    ContentType: getContentType(file)
  })
  if (file.endsWith('.tar.gz')) {
    return uploadMultipart(client, file, params)
  } else {
    return uploadObject(client, file, params)
  }
}

async function uploadMultipart (client, file, params) {
  const multipart = await client.createMultipartUpload(params).promise()
  const uploadData = { Parts: [] }

  let partNumber = 0
  let chunks = []
  let chunkLength = 0

  async function uploadChunks () {
    const partParams = {
      Bucket: params.Bucket,
      Key: params.Key,
      Body: Buffer.concat(chunks),
      PartNumber: ++partNumber,
      UploadId: multipart.UploadId
    }
    Log.info('Uploading part', partParams.PartNumber, Log.blue(partParams.Key))

    const { ETag } = await uploadMultipartChunk(client, partParams)
    uploadData.Parts[partParams.PartNumber - 1] = {
      ETag,
      PartNumber: partParams.PartNumber
    }
    Log.info('Completed part', partParams.PartNumber, Log.blue(partParams.Key))
    chunks = []
    chunkLength = 0
  }

  const multipartUpload = new Writable({
    write (chunk, encoding, callback) {
      if (chunk.length + chunkLength < MULTIPART_CHUNK_SIZE) {
        chunks.push(chunk)
        chunkLength += chunk.length
        callback()
        return
      }

      uploadChunks().then((_, error) => {
        chunks = [chunk]
        chunkLength = chunk.length
        callback(error)
      })
    }
  })

  let hasError = false
  try {
    await promisify(pipeline)(fs.createReadStream(file), multipartUpload)
    await uploadChunks()
  } catch (error) {
    Log.error('Encountered error uploading multipart file', Log.blue(params.awsKey), error)
  }

  // complete the upload whether we finished or not.
  await client.completeMultipartUpload({
    Bucket: params.Bucket,
    Key: params.Key,
    MultipartUpload: uploadData,
    UploadId: multipart.UploadId
  }).promise()

  if (hasError) process.exit(-1)
}

async function uploadMultipartChunk (client, params, tryNumber = 0) {
  try {
    return await client.uploadPart(params).promise()
  } catch (error) {
    if (tryNumber < MAX_UPLOAD_TRIES) {
      return uploadMultipartChunk(client, params, tryNumber + 1)
    } else {
      throw error
    }
  }
}

async function uploadObject (client, file, params) {
  try {
    await client.putObject({ ...params, Body: fs.createReadStream(file) }).promise()
  } catch (error) {
    Log.error('Encountered error uploading file', Log.blue(params.awsKey), error)
    process.exit(-1)
  }
}

async function deleteOldFiles (client, prefix, toKeep) {
  let keys
  try {
    keys = (await client.listObjects({ Prefix: prefix }).promise())
      .Contents
      .filter(({ Key }) => !toKeep.includes(Key))
      .map(({ Key }) => {
        Log.warning('Deleting remote file', Key)
        return { Key }
      })
  } catch (error) {
    Log.error('Encountered error indexing bucket', error)
    process.exit(-1)
  }

  if (keys.length === 0) return

  try {
    await client.deleteObjects({ Delete: { Objects: keys } }).promise()
  } catch (error) {
    Log.error('Encountered error deleting files', error)
    process.exit(-1)
  }
}

export async function syncToAWS ({ awsBucket, awsPath, jsonOnly }, dir) {
  Log.info('Syncing to AWS', Log.blue(`[bucket: ${awsBucket}]`), dir)

  const client = new S3({ params: { Bucket: awsBucket } })
  const { media, configs } = await getFilePaths(dir)

  for (let file of media) {
    await uploadFile(client, awsPath, file, ASSET_HEADERS(file))
  }
  for (let file of configs) {
    await uploadFile(client, awsPath, file, CONFIG_HEADERS)
  }

  if (!jsonOnly) {
    await deleteOldFiles(
      client,
      awsPath,
      [
        ...media.map(file => path.normalize(`${awsPath}/${path.parse(file).base}`)),
        ...configs.map(file => path.normalize(`${awsPath}/${path.parse(file).base}`))
      ]
    )
  }

  Log.info('AWS Sync complete!')

  Log.info('Removing temporary directory', dir)
  // fs.rmdir can't delete a non-empty directory
  await promisify(exec)(`rm -rf ${dir}`)
}

export async function readCurrentConfig ({ awsBucket, awsPath, config }) {
  const fileKey = `${awsPath}${path.parse(config).base}`
  Log.info(
    'Reading current config from AWS',
    Log.blue(`[file: s3://${awsBucket}/${fileKey}]`)
  )

  const client = new S3({ params: { Bucket: awsBucket } })
  const { Body } = await client.getObject({ Key: fileKey }).promise()
  return JSON.parse(Body)
}
