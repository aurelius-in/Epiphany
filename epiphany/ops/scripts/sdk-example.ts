import { enhance, generateImage, waitForJob } from '../../packages/sdk/src/index'

async function main() {
  const BASE = process.env.API_BASE || 'http://localhost:4000'
  const KEY = process.env.API_KEY || 'dev'
  const enh = await enhance(BASE, KEY, 'cinematic portrait, neon city at night')
  const job = await generateImage(BASE, KEY, { prompt: enh.promptEnhanced, mode: 0, aspect: '1:1' as any })
  const done = await waitForJob(BASE, KEY, job.id, { signed: true, ttlSec: 600, onProgress: p => process.stdout.write(`\rprogress ${p}%   `) })
  console.log('\noutput', done.outputUrl)
}

main().catch(e => { console.error(e); process.exit(1) })


