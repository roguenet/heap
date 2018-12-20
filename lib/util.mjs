/**
 * Copyright (c) 2018 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs'
import crypto from 'crypto'

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
