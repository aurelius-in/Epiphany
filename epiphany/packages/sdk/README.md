Epiphany SDK (TypeScript)

Install
```
npm i @epiphany/sdk
```

Quick start
```ts
import { enhance, generateImage, getJob, waitForJob } from '@epiphany/sdk'

const BASE = 'http://localhost:4000'
const KEY = 'dev'

const enh = await enhance(BASE, KEY, 'cinematic portrait, neon city at night')
const job = await generateImage(BASE, KEY, { prompt: enh.promptEnhanced, mode: 0, aspect: '1:1' })
const done = await waitForJob(BASE, KEY, job.id, { signed: true, ttlSec: 900, onProgress: p => console.log('progress', p) })
console.log('output', done.outputUrl)
```

Uploads
```ts
import { requestUploadUrl, putBytesSigned } from '@epiphany/sdk'

const up = await requestUploadUrl(BASE, KEY, undefined, 'image/png')
await putBytesSigned(up.putUrl, new Uint8Array([...bytes]), 'image/png')
console.log('public url', up.publicUrl)
```

Notes
- Set `X-API-Key` via the SDK call arguments
- Most list/get endpoints support `signed` and `ttlSec` for temporary URLs
- Use `streamJobWithKey` or `waitForJob` to follow job progress

