#!/usr/bin/env node --experimental-modules

/**
 * Copyright (c) 2018-2019 Nathan Curtis
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const Yargs = require('yargs')

async function run () {
  /* eslint-disable no-unused-expressions */
  // noinspection BadExpressionStatementJS
  Yargs
    .usage('$0 <cmd> [args]')

    .command(await import('../lib/commands/importImages'))
    .command(await import('../lib/commands/exportHeap'))

    .option('verbose', {
      alias: 'v',
      default: false,
      boolean: true
    })
    .option('config', {
      describe: 'Config file to use for selected command.',
      default: 'heap.json'
    })

    .command({
      command: '*',
      handler (argv) {
        console.info(`No valid command detected, try: ${argv.$0} --help`)
      }
    })

    .demandCommand()
    .help()
    .wrap(80)
    .argv
}

run()
