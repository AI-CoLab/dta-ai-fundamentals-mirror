// Writes the DTA module as Markdown lesson files, from what scripts/pull.mjs fetched.
//
// Reads   data/course.json                         the course as Rise holds it
// Writes  content/source.json                      who publishes it, and on what terms
//         content/courses/<course>/index.md        the course's title and description
//         content/courses/<course>/<NN.section>/…  its sections and lessons
//
// How a lesson is written, and the word-for-word check each is held to, is the contracts
// repository's Rise converter (@aicolab/learning-contracts/convert/rise).
//
// content/ is written whole on every run, from nothing, and the same input always writes the
// same files.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { heading, lessonFiles, lineOf, markdownOf, slugOf } from '@aicolab/learning-contracts/convert/rise'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'content')
const save = async (path, text) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, text)
}

const course = JSON.parse(await readFile(join(ROOT, 'data', 'course.json'), 'utf8'))
const dir = join(OUT, 'courses', slugOf(course.title))

await rm(OUT, { recursive: true, force: true })
await save(
  join(OUT, 'source.json'),
  `${JSON.stringify(
    {
      id: 'dta-ai-fundamentals',
      name: 'Digital Transformation Agency',
      home: 'https://www.digital.gov.au/ai/ai-in-government-policy/staff-training',
      licence: { spdx: 'CC-BY-4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
      attribution: '© Commonwealth of Australia (Digital Transformation Agency)',
    },
    null,
    2,
  )}\n`,
)
await save(join(dir, 'index.md'), `${[heading(1, lineOf(course.title)), markdownOf(course.description)].filter(Boolean).join('\n\n')}\n`)

const files = lessonFiles(course, 'dta/scormcontent/assets')
for (const file of files) await save(join(dir, file.path), file.markdown)

console.log(`lessons and section pages written ${files.length}, words checked ${files.reduce((sum, file) => sum + file.words, 0)}`)
