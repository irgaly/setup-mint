import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { ExecOptions } from '@actions/exec'

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
    const useCache = (core.getInput('use-cache') == 'true')
    core.debug(`useCache: ${useCache}`)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

main()
