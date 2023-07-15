/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { logConfig, readLocalConfig, writeLocalConfig } from '../Config'
import { Log, setVerbose } from '../Log'

async function setCdnPrefix (args) {
  const { verbose, config: configPath, cdnPrefix } = args
  setVerbose(verbose)

  if (cdnPrefix == null) {
    Log.error('cdn-prefix is required!', args)
    process.exit(-1)
  }

  const localConfig = await readLocalConfig(configPath)
  localConfig.cdnPrefix = cdnPrefix
  logConfig(localConfig, configPath)
  await writeLocalConfig(localConfig, configPath)
}

// Yargs command definition
export const command = 'set-cdn-prefix <cdn-prefix>'
export const describe = 'Sets the prefix applied to image paths to create a publicly accessible URL'
export const builder = yargs => {
  yargs.positional('cdn-prefix', {
    describe: 'The prefix to apply to image URLs'
  })
}
export const handler = setCdnPrefix
