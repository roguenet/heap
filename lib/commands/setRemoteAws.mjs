/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { logConfig, readLocalConfig, writeLocalConfig } from '../Config'
import { Log, setVerbose } from '../Log'

async function setRemoteAws (args) {
  const { verbose, config: configPath, bucket, path } = args
  setVerbose(verbose)

  if (bucket == null || path == null) {
    Log.error('bucket and path are required!')
    process.exit(-1)
  }

  const localConfig = await readLocalConfig(configPath)
  localConfig.remote = {
    AWS: { bucket, path }
  }
  logConfig(localConfig, configPath)
  await writeLocalConfig(localConfig, configPath)
}

// Yargs command definition
export const command = 'set-remote-aws'
export const describe = `Add AWS config parameters to the heap config

  Uses credentials from the environment (AWS_PROFILE) to send the exported heap to the given\
  bucket. With this remote, a temporary directory is used to stage the\
  export, and then the contents are synced to the given bucket. BEWARE: any files not\
  resulting from this export that are in the target bucket WILL BE DELETED.\
`
export const builder = yargs => {
  yargs.options({
    'bucket': {
      describe: 'Bucket to contain the exported version of this heap'
    },
    'path': {
      describe: 'Path within the bucket to put this exported heap into'
    }
  })
}
export const handler = setRemoteAws
