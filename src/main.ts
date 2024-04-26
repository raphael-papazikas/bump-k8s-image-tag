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

    core.info('Configuring Git')
    shell.exec(`git config --global user.name "${config.owner}"`)
    shell.exec(`git config --global user.email "robot@example.com"`)

    shell.mkdir('-p', config.clonePath)
    shell.cd(config.clonePath)

    core.info('Cloning Repository')
    shell.exec(`git clone ${config.repoUrl}`)
    shell.cd(config.repoDirectory)
    if (config.git_name) {
      shell.exec(`git config user.name "${config.git_name}"`)
    }
    if (config.git_email) {
      shell.exec(`git config user.email "${config.git_email}"`)
    }

    core.info('Creating Branch')
    shell.exec(`git checkout -B ${config.branch}`)

    core.info('Bump Version')
    await bumpVersions(config)

    core.info('Committing Changes')
    shell.exec(`git add .`)
    shell.exec(`git commit -m "${config.commitMsg}"`)
    shell.exec(`git push -u origin ${config.branch}`)

    core.info('Creating Pull Request')
    const resp = await github.getOctokit(config.PAT).rest.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: config.commitMsg,
      head: config.branch,
      base: config.base
    })

    core.info('Pull Request Created')
    core.debug(JSON.stringify(resp.data))

    if (String(config.auto_merge) === 'true') {
      core.info('Auto Merge is configured')
      const mergeResponse = await github
        .getOctokit(config.PAT)
        .rest.pulls.merge({
          owner: config.owner,
          repo: config.repo,
          pull_number: resp.data.number,
          merge_method: 'squash'
        })
      core.debug('Merge Response')
      core.debug(JSON.stringify(mergeResponse.data))
    }
  } catch (e) {
    if (e instanceof Error) core.setFailed(e.message)
  }
  core.info('Cleanup')
  shell.rm('-rf', config.clonePath)
}

run()
