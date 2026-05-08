#!/usr/bin/env node
/**
 * GitHub API helper for dev-loop.sh
 * Usage: node dev-loop-api.js <command> [args...]
 *
 * Commands:
 *   check-token
 *   wait-for-run   <workflow_file> <branch> <push_time> <poll_interval> <max_wait>
 *   poll-run       <run_id>
 *   list-jobs      <run_id>
 *   job-log        <job_id>
 */

'use strict'
const https = require('https')
const { execSync } = require('child_process')

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN || ''
const OWNER = 'TITANICBHAI'
const REPO  = 'FocusFlow-pc'

function apiRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : ''
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${OWNER}/${REPO}${path}`,
      method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'focusflow-dev-loop',
        ...(bodyStr ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(data) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

function apiRate() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/rate_limit',
      method: 'GET',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'focusflow-dev-loop',
      }
    }
    let data = ''
    https.request(opts, res => {
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch { resolve({}) }
      })
    }).on('error', reject).end()
  })
}

function fetchLog(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'))
    const u = new URL(url)
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'focusflow-dev-loop',
      }
    }
    https.request(opts, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchLog(res.headers.location, redirects + 1).then(resolve).catch(reject)
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => resolve(data))
    }).on('error', reject).end()
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  const [,, cmd, ...args] = process.argv

  if (cmd === 'check-token') {
    const d = await apiRate()
    const remaining = d?.rate?.remaining ?? 0
    if (!TOKEN) { console.error('NO_TOKEN'); process.exit(1) }
    if (remaining === 0 && !d?.rate) { console.error('INVALID'); process.exit(1) }
    console.log(remaining)
    return
  }

  if (cmd === 'wait-for-run') {
    const [workflowFile, branch, pushTime, pollStr, maxStr] = args
    const poll = parseInt(pollStr) * 1000
    const max  = parseInt(maxStr)  * 1000
    let waited = 0
    while (waited < max) {
      await sleep(poll)
      waited += poll
      const d = await apiRequest('GET', `/actions/workflows/${workflowFile}/runs?branch=${branch}&per_page=5`)
      const runs = (d.workflow_runs || []).sort((a, b) => b.created_at.localeCompare(a.created_at))
      const match = runs.find(r => r.created_at >= pushTime)
      if (match) { console.log(match.id); return }
      process.stderr.write(`  ...waiting for run (${Math.floor(waited/1000)}s elapsed)\n`)
    }
    process.stderr.write('TIMEOUT\n')
    process.exit(1)
  }

  if (cmd === 'poll-run') {
    const [runId] = args
    const d = await apiRequest('GET', `/actions/runs/${runId}`)
    console.log(JSON.stringify({ status: d.status, conclusion: d.conclusion || '' }))
    return
  }

  if (cmd === 'jobs-summary') {
    const [runId] = args
    const d = await apiRequest('GET', `/actions/runs/${runId}/jobs`)
    const lines = (d.jobs || []).map(j => {
      const steps = (j.steps || []).filter(s => s.status !== 'queued').slice(-3).map(s => s.name).join(', ')
      return `  [${j.status}/${j.conclusion || '-'}] ${j.name}${steps ? ' (' + steps + ')' : ''}`
    })
    console.log(lines.join('\n'))
    return
  }

  if (cmd === 'list-job-ids') {
    const [runId] = args
    const d = await apiRequest('GET', `/actions/runs/${runId}/jobs`)
    ;(d.jobs || []).forEach(j => console.log(`${j.id} ${j.name}`))
    return
  }

  if (cmd === 'job-log') {
    const [jobId] = args
    const logUrl = `https://api.github.com/repos/${OWNER}/${REPO}/actions/jobs/${jobId}/logs`
    const log = await fetchLog(logUrl)
    const lines = log.split('\n')
    console.log(lines.slice(-200).join('\n'))
    return
  }

  console.error(`Unknown command: ${cmd}`)
  process.exit(1)
}

main().catch(e => { console.error(e.message); process.exit(1) })
