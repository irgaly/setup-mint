import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { ExecOptions } from '@actions/exec'

const execute = async (command: string): Promise<string> => {
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
  await exec.exec(command, null, options)
  return output
}

async function run() {
  try {
    const useCache = core.getInput('use-cache')
    core.debug("useCache: ${useCache}")
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
