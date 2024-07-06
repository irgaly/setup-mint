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

/**
 * return true if the child path is under the parent path in UNIX file system.
 */
function pathContains(parent: string, child: string): boolean {
  return !path.relative(parent, child).startsWith("../")
}

// Caching may throw errors for legitimate reasons that should not fail the action.
// Example: Race condition between multiple github runners where both try to save cache with the same key at the same time. 
// You only need 1 of the runners to save the cache. The other runners can gracefully ignore the error and continue running. 
async function saveCache(paths: string[], key: string): Promise<void> {
  try {
    await cache.saveCache(paths, key)  
  } catch (error) {
    core.warning(`Failed to cache ${key}. Error thrown: ${error}`)
  }
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
    let mintVersion = 'master'
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
    const binaryDirectoryPrefix = `${process.env['HOME']}`
    const binaryDirectory = `${binaryDirectoryPrefix}/bin`
    const mintPath = `${binaryDirectory}/mint`
    const mintCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-${process.env['RUNNER_ARCH']}-irgaly/setup-mint-${mintVersion}`
    const mintPaths = [mintPath]
    core.info(`mint cache key: ${mintCacheKey}`)
    const mintRestored = ((await cache.restoreCache(mintPaths, mintCacheKey)) != undefined)
    if (mintRestored) {
      core.info(`${mintPath} restored from cache`)
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
      if (os.platform() == 'darwin') {
        await execute('make', ['-C', `${temp}/Mint`, `PREFIX=${binaryDirectoryPrefix}`])
      } else {
        await execute('swift', ['build', '-c', 'release'], `${temp}/Mint`)
        fs.mkdirSync(binaryDirectory, { recursive: true })
        fs.copyFileSync(`${temp}/Mint/.build/release/mint`, mintPath)
      }

      await saveCache(mintPaths, mintCacheKey)
    }
    if (hasMintfile && bootstrap) {
      const mintDirectory = (process.env['MINT_PATH'] || '~/.mint').replace(/^~\//, `${os.homedir()}/`)
      const mintBinaryDirectory = (process.env['MINT_LINK_PATH'] || '~/.mint/bin').replace(/^~\//, `${os.homedir()}/`)
      const mintBinaryNeedsCache = !pathContains(mintDirectory, mintBinaryDirectory)
      const mintPackagesDirectory = `${mintDirectory}/packages`
      const mintDependencyPaths = [mintDirectory]
      const mintDependencyCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-${process.env['RUNNER_ARCH']}-irgaly/setup-mint-deps-${await hashFiles(mintFile)}`
      const mintDependencyRestoreKeys = [`${cachePrefix}-${process.env['RUNNER_OS']}-${process.env['RUNNER_ARCH']}-irgaly/setup-mint-deps-`]
      const mintBinaryPaths = [mintBinaryDirectory]
      const mintBinaryCacheKey = `${cachePrefix}-${process.env['RUNNER_OS']}-${process.env['RUNNER_ARCH']}-irgaly/setup-mint-bin-${await hashFiles(mintFile)}`
      const mintBinaryRestoreKeys = [`${cachePrefix}-${process.env['RUNNER_OS']}-${process.env['RUNNER_ARCH']}-irgaly/setup-mint-bin-`]
      core.info(`mint dependency cache key: ${mintDependencyCacheKey}`)
      core.info(`mint binary cache key: ${mintBinaryCacheKey}`)
      let mintDependencyRestored = false
      if (useCache) {
        const mintDependencyRestoredKey = await cache.restoreCache(
          mintDependencyPaths, mintDependencyCacheKey, mintDependencyRestoreKeys
        )
        if (mintBinaryNeedsCache) {
          await cache.restoreCache(mintBinaryPaths, mintBinaryCacheKey, mintBinaryRestoreKeys)
        }
        mintDependencyRestored = (mintDependencyRestoredKey == mintDependencyCacheKey)
      }
      if (mintDependencyRestored) {
        core.info(`${mintDirectory} / ${mintBinaryDirectory} restored from cache`)
      } else {
        await execute(mintPath, ['bootstrap', '-v', '-m', `${mintFile}`])
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
            const installedPackages = fs.readdirSync(mintPackagesDirectory)
              .filter(item => {
                return !item.startsWith('.')
              }).flatMap(repo => {
                const [owner, name] = repo.split('_').slice(-2)
                return fs.readdirSync(`${mintPackagesDirectory}/${repo}/build`).filter(item => {
                  return !item.startsWith('.')
                }).map(version => {
                  return {
                    build: `${mintPackagesDirectory}/${repo}/build/${version}`,
                    name: `${owner}/${name}@${version}`,
                    short: `${owner}/${name}`
                  }
                })
              })
            for (const installed of installedPackages) {
              core.info(`installed: ${installed.name}`)
              if (!defined.includes(installed.name) && !defined.includes(installed.short)) {
                core.info(`=> unisntall: ${installed.name}`)
                await execute(mintPath, ['uninstall', `${installed.name}`])
                const builds = path.dirname(installed.build)
                if (fs.readdirSync(builds).length == 0) {
                  fs.rmdirSync(path.dirname(builds), { recursive: true })
                }
              }
            }
          }
          await saveCache(mintDependencyPaths, mintDependencyCacheKey)
          if (mintBinaryNeedsCache) {
            await saveCache(mintBinaryPaths, mintBinaryCacheKey)
          }
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
