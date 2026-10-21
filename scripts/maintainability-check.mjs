import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entrypoint = path.join(root, 'backend', 'src', 'index.mjs')
const routesDir = path.join(root, 'backend', 'src', 'http', 'routes')
const maxEntrypointLines = 1200
const maxRouteLines = 700

const lineCount = source => source.split(/\r?\n/).length
const fail = message => {
  console.error(`[fail] ${message}`)
  process.exitCode = 1
}

const entrySource = await fs.readFile(entrypoint, 'utf8')
const entryLines = lineCount(entrySource)
if (entryLines <= maxEntrypointLines) console.log(`[pass] HTTP composition entrypoint: ${entryLines} lines`)
else fail(`HTTP composition entrypoint exceeds ${maxEntrypointLines} lines: ${entryLines}`)

const routeNames = (await fs.readdir(routesDir)).filter(name => name.endsWith('.mjs')).sort()
if (!routeNames.length) fail('No HTTP route modules found')

for (const name of routeNames) {
  const file = path.join(routesDir, name)
  const source = await fs.readFile(file, 'utf8')
  const lines = lineCount(source)
  if (lines <= maxRouteLines) console.log(`[pass] ${name}: ${lines} lines`)
  else fail(`${name} exceeds ${maxRouteLines} lines: ${lines}`)

  if (/createServer\s*\(|\.listen\s*\(/.test(source)) fail(`${name} owns a process listener; route modules must remain transport-agnostic`)
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status === 0) console.log(`[pass] ${name}: syntax`)
  else fail(`${name} has invalid syntax: ${syntax.stderr || syntax.stdout || 'node --check failed'}`)
  if (!/^export\s+(?:async\s+)?function\s+handle[A-Za-z0-9]+Routes/m.test(source) && !/^export\s+const\s+handle[A-Za-z0-9]+Routes/m.test(source)) {
    fail(`${name} does not expose a documented handler contract`)
  }
}

if (!/handleAiRoutes/.test(entrySource) || !/handleDataQualityRoutes/.test(entrySource)) {
  fail('Main server is missing the AI or data-quality route composition boundary')
} else {
  console.log('[pass] Main server keeps AI and data-quality behind composition boundaries')
}

if (process.exitCode) process.exit(process.exitCode)
