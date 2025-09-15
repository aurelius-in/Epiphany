import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { getEnv } from './env'
import { requestId, apiKeyAuth } from './middleware'
import { routes } from './routes'
import { healthSummary } from './health'
import { startWorkers } from './workers'

const env = getEnv()
const app = express()

app.use(requestId)
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))
app.use(apiKeyAuth(env.API_KEY))

app.get('/v1/health', async (_req, res) => {
	const summary = await healthSummary(env)
	res.json(summary)
})

// simple enhance passthrough: move to routes with smarter logic
app.post('/v1/enhance', (req, res) => {
	const prompt = String((req.body?.prompt ?? '')).trim()
	const seedPhrases = prompt ? [prompt.split(',')[0].trim()].filter(Boolean) : []
	res.json({ promptEnhanced: prompt || 'a detailed high-quality image', seedPhrases })
})

app.use('/v1', routes)

// centralized error handler
app.use((err: any, _req: any, res: any, _next: any) => {
	const code = typeof err?.status === 'number' ? err.status : 500
	res.status(code).json({ error: err?.message || 'internal_error' })
})

startWorkers()

app.listen(env.API_PORT, () => console.log(`[api] listening on :${env.API_PORT}`))
