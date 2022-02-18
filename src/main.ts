import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as cache from '@actions/cache'
import * as glob from '@actions/glob'
import { ExecOptions } from '@actions/exec'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

async function execute(command: string, args: string[] = []): Promise<string> {
  let output = ''
  const options: ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    },
    stderr: (data: Buffer) => {
      console.error(data)
    }
  }
  await exec.exec(command, args, options)
  return output
}

async function main() {
  try {
    const bootstrap = (core.getInput('bootstrap') == 'true')
    const useCache = (core.getInput('use-cache') == 'true')
    const cachePrefix = core.getInput('cache-prefix')
    core.debug(`bootstrap: ${bootstrap}`)
    core.debug(`useCache: ${useCache}`)
    let mintVersion = '0.17.0'
    if (fs.existsSync('Mintfile')) {
      const mintfile = fs.readFileSync('Mintfile').toString()
      const match = mintfile.match(/^\s*yonaskolb\/mint@([^\s#]+)/)
      if (match) {
        mintVersion = match[1]
        core.debug(`mintVersion from Mintfile: ${mintVersion}`)
      }
    }
    const mintCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-irgaly/setup-mint-${mintVersion}`
    const mintPaths = ['/usr/local/bin/mint']
    core.debug(`mint cache key: ${mintCacheKey}`)
    const mintRestored = (await cache.restoreCache(mintPaths, mintCacheKey) != undefined)
    const mintRestored = false
    if (!mintRestored) {
      const temp = path.join(process.env['RUNNER_TEMP'] || '.', uuidv4())
      fs.mkdirSync(temp, { recursive: true })
      await execute('git',
        ['-c', 'advice.detachedHead=false',
        '-C', temp,
        'clone',
        '--depth=1',
        '-b', mintVersion,
        'git@github.com:yonaskolb/Mint.git'])
      await execute('make', ['-C', `${temp}/Mint`])
      await cache.saveCache(mintPaths, mintCacheKey)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

main()
