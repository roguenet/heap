/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { logConfig, readLocalConfig } from '../Config'
import { setVerbose } from '../Log'

async function info (args) {
  const { verbose, config: configPath } = args
  setVerbose(verbose)

  const localConfig = await readLocalConfig(configPath)
  logConfig(localConfig, configPath)
}

// Yargs command definition
export const command = 'info'
export const describe = 'Get information about the given heap'
export const builder = yargs => { }
export const handler = info
