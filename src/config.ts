import * as core from '@actions/core'
import path from 'path'

const owner = core.getInput('owner')
const repo = core.getInput('repo')
const image = core.getInput('image')
const tag = core.getInput('tag')
const PAT = core.getInput('PAT')
const base = core.getInput('base') || 'main'

export type IConfig = {
  base: string
  basePath: string
  branch: string
  commitMsg: string
  clonePath: string
  image: string
  owner: string
  PAT: string
  repo: string
  repoDirectory: string
  repoUrl: string
  tag: string
}

export function getConfig(): IConfig {
  const basePath = path.resolve('./')
  const clonePath = path.resolve('./tmp')

  const concatenated = `${image}:${tag}`
  const branch = `bump-${concatenated.replace(/[^a-zA-Z0-9]/g, '_')}`

  const commitMsg = `chore(deployment): bump ${image} to ${tag}`

  const repoDirectory = path.resolve(clonePath, repo)

  return {
    base,
    basePath,
    branch,
    commitMsg,
    clonePath,
    image,
    owner,
    PAT,
    repo,
    repoDirectory,
    repoUrl: `https://bot:${PAT}@github.com/${owner}/${repo}.git`,
    tag
  }
}
