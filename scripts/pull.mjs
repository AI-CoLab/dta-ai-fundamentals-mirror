// Pulls the Digital Transformation Agency's "AI in government: fundamentals training" from
// the package it publishes for download. No login.
//
// Source:  https://www.digital.gov.au/ai/ai-in-government-policy/staff-training
//          which offers the module as SCORM 1.2, SCORM 2004 and xAPI packages. The SCORM 1.2
//          package is taken; all three hold the same Articulate Rise course.
// Licence: CC BY 4.0, as digital.gov.au states for the site.
//
// Writes:  files/dta/…          the package's pictures (its player is left behind)
//          data/course.json     the course as Rise holds it: its lessons, each a list of blocks
//
// A Rise package keeps its course as base64 JSON in one of three places, by the export's age:
// scormcontent/runtime-data.js, a file under scormcontent/locales/, or scormcontent/index.html.

import { execFile } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE = 'https://www.digital.gov.au/sites/default/files/documents/2025-08/ai-gov-fundamentals-training-scorm12.zip'
const MEDIA = join(ROOT, 'files', 'dta')
const run = promisify(execFile)

const zip = join(ROOT, 'files', 'package.zip')
await mkdir(dirname(zip), { recursive: true })
const response = await fetch(PACKAGE, { headers: { 'user-agent': 'dta-ai-fundamentals-mirror/1 (content mirror; CC BY 4.0)' } })
if (!response.ok || !response.body) throw new Error(`${response.status} downloading the package`)
await pipeline(Readable.fromWeb(response.body), createWriteStream(zip))

await rm(MEDIA, { recursive: true, force: true })
await mkdir(MEDIA, { recursive: true })
try {
  await run('unzip', ['-q', '-o', zip, '-x', 'scormcontent/lib/*', 'scormdriver/*', '*.xsd', '-d', MEDIA], { maxBuffer: 1 << 24 })
} catch (error) {
  if (error.code !== 1) throw error // 1 is "finished with warnings"
}
await rm(zip)

const content = join(MEDIA, 'scormcontent')
const locales = await readdir(join(content, 'locales')).catch(() => [])
let course
for (const holder of ['runtime-data.js', ...locales.sort().map((name) => `locales/${name}`), 'index.html']) {
  const wrapped = await readFile(join(content, holder), 'utf8').catch(() => '')
  const encoded = wrapped.match(/"([A-Za-z0-9+/=]{2000,})"/)
  if (!encoded) continue
  course = JSON.parse(Buffer.from(encoded[1], 'base64').toString('utf8')).course
  break
}
if (!course) throw new Error('the package holds no Rise course this script can find')

await mkdir(join(ROOT, 'data'), { recursive: true })
await writeFile(join(ROOT, 'data', 'course.json'), `${JSON.stringify(course, null, 2)}\n`)
console.log(`"${course.title}": ${course.lessons.length} lessons and sections`)
