import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { randomUUID } from 'crypto'

const app = express()

// middleware
app.use((req, _res, next) => { (req as any).id = randomUUID(); next(); })
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/v1/health', async (_req, res) => {
  res.json({ ok: true, services: { db: false, redis: false, s3: false } })
})

const port = process.env.API_PORT || 4000
app.listen(port, () => console.log(`[api] listening on :${port}`))
