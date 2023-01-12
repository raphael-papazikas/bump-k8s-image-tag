import * as core from '@actions/core'
import * as github from '@actions/github'
import {IConfig, getConfig} from './config'
import fs from 'fs'
import {glob} from 'glob'
import path from 'path'
import shell from 'shelljs'
import yaml from 'yaml'

function updateVersions(filePath: string, regexStr: string, tag: string): void {
  const regex = new RegExp(regexStr)
  let changed = false

  const documents = yaml.parseAllDocuments(fs.readFileSync(filePath, 'utf-8'))
  for (const document of documents) {
    yaml.visit(document, {
      Pair(_, pair) {
        if (
          yaml.isScalar(pair.key) &&
          yaml.isScalar(pair.value) &&
          pair.key.value === 'image'
        ) {
          if (regex.test(pair.value.value as string)) {
            const [image] = String(pair.value.value).split(':')
            pair.value.value = `${image}:${tag}`
            changed = true
          }
        }
      }
    })
  }

  if (changed) {
    const newContent = documents.map(doc => doc.toString()).join('\n')
    fs.writeFileSync(filePath, newContent)
  }
}

async function bumpVersions(config: IConfig): Promise<void> {
  return new Promise<void>((res, rej) => {
    glob('**/*.+(yaml|yml)', {cwd: config.repoDirectory}, (err, matches) => {
      if (err !== null) {
        return rej(err)
      }

      for (const match of matches) {
        updateVersions(
          path.resolve(config.repoDirectory, match),
          config.image,
          config.tag
        )
      }

      res()
    })
  })
}

async function run(): Promise<void> {
  const config = getConfig()
  try {
    shell.config.fatal = true

    shell.exec(`git config --global user.name "${config.owner}"`)
    //shell.exec(`git config --global user.email "${config.owner}"`)
    shell.mkdir('-p', config.clonePath)
    shell.cd(config.clonePath)
    shell.exec(`git clone ${config.repoUrl}`)
    shell.cd(config.repoDirectory)
    shell.exec(`git checkout -B ${config.branch}`)
    await bumpVersions(config)
    shell.exec(`git add .`)
    shell.exec(`git commit -m "${config.commitMsg}"`)
    shell.exec(`git push -u origin ${config.branch}`)

    await github.getOctokit(config.PAT).rest.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: config.commitMsg,
      head: config.branch,
      base: config.base
    })
  } catch (e) {
    if (e instanceof Error) core.setFailed(e.message)
  }
  shell.rm('-rf', config.clonePath)
}

run()
