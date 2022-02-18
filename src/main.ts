import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { ExecOptions } from '@actions/exec'
import * as fs from 'fs'

async function execute(command: string): Promise<string> {
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
  await exec.exec(command, [], options)
  return output
}

async function main() {
  try {
    const bootstrap = (core.getInput('bootstrap') == 'true')
    const useCache = (core.getInput('use-cache') == 'true')
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
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

main()
