import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { ExecOptions } from '@actions/exec'
import * as cache from '@actions/cache'
import * as glob from '@actions/glob'
import { hashFiles } from '@actions/glob'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'

async function execute(command: string, args: string[] = [], cwd?: string): Promise<string> {
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
  if (cwd) {
    options.cwd = cwd
  }
  await exec.exec(command, args, options)
  return output
}

async function main() {
  try {
    const mintDirectory = core.getInput('mint-directory')
    const bootstrap = (core.getInput('bootstrap') == 'true')
    const useCache = (core.getInput('use-cache') == 'true')
    const cachePrefix = core.getInput('cache-prefix')
    const clean = (core.getInput('clean') == 'true')
    core.info(`mintDirectory: ${mintDirectory}`)
    core.info(`bootstrap: ${bootstrap}`)
    core.info(`useCache: ${useCache}`)
    core.info(`cachePrefix: ${cachePrefix}`)
    let mintVersion = '0.17.0'
    const mintFile = path.join(mintDirectory, 'Mintfile')
    const hasMintfile = fs.existsSync(mintFile)
    if (hasMintfile) {
      core.info(`mintFile exists: ${mintFile}`)
      const mintFileString = fs.readFileSync(mintFile).toString()
      const match = mintFileString.match(/^\s*yonaskolb\/mint@([^\s#]+)/)
      if (match) {
        mintVersion = match[1]
        core.info(`mintVersion from Mintfile: ${mintVersion}`)
      }
    }
    const mintCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-irgaly/setup-mint-${mintVersion}`
    const mintPaths = ['/usr/local/bin/mint']
    core.info(`mint cache key: ${mintCacheKey}`)
    const mintRestored = ((await cache.restoreCache(mintPaths, mintCacheKey)) != undefined)
    if (mintRestored) {
      core.info('/usr/local/bin/mint restored from cache')
    } else {
      const temp = path.join(process.env['RUNNER_TEMP'] || '.', uuidv4())
      fs.mkdirSync(temp, { recursive: true })
      await execute('git',
        ['-c', 'advice.detachedHead=false',
        '-C', temp,
        'clone',
        '--depth=1',
        '-b', mintVersion,
        'https://github.com/yonaskolb/Mint.git'])
      await execute('make', ['-C', `${temp}/Mint`])
      await cache.saveCache(mintPaths, mintCacheKey)
    }
    if (hasMintfile && bootstrap) {
      const mintDependencyPaths = ['~/.mint']
      const mintDependencyCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-irgaly/setup-mint-deps-${await hashFiles(mintFile)}`
      const mintDependencyRestoreKeys = [`${cachePrefix}-${process.env['RUNNER_OS']}-irgaly/setup-mint-deps-`]
      core.info(`mint dependency cache key: ${mintDependencyCacheKey}`)
      let mintDependencyRestored = false
      if (useCache) {
        const mintDependencyRestoredKey = await cache.restoreCache(
          mintDependencyPaths, mintDependencyCacheKey, mintDependencyRestoreKeys
        )
        mintDependencyRestored = (mintDependencyRestoredKey == mintDependencyCacheKey)
      }
      if (mintDependencyRestored) {
        core.info('~/.mint restored from cache')
      } else {
        await execute('mint', ['bootstrap'], mintDirectory)
        if (useCache) {
          if (clean) {
            const mintFileString = fs.readFileSync(mintFile).toString()
            const defined = mintFileString.split('\n').map(line => {
              return line.match(/^\s*([^\s#]+)/) || []
            }).filter(match => { return match.length })
              .map(match => { return match[1] })
            defined.forEach(v => {
              core.info(`Mintfile defined: ${v}`)
            })
            const packages = `${os.homedir()}/.mint/packages`
            const installedPackages = fs.readdirSync(packages)
              .filter(item => {
                return !item.startsWith('.')
              }).flatMap(repo => {
                const [owner, name] = repo.split('_').slice(-2)
                return fs.readdirSync(`${packages}/${repo}/build`).filter(item => {
                  return !item.startsWith('.')
                }).map(version => {
                  return `${owner}/${name}@${version}`
                })
              })
            for (const installed of installedPackages) {
              core.info(`installed: ${installed}`)
              if (!defined.includes(installed)) {
                core.info(`unisntall: ${installed}`)
                await execute('mint', ['uninstall', installed])
              }
            }
          }
          await cache.saveCache(mintDependencyPaths, mintDependencyCacheKey)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

main()
