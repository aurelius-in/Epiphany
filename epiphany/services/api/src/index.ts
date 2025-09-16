import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { getEnv } from './env'
import { requestId, apiKeyAuth, tinyRateLimit, urlAllowlist } from './middleware'
import { routes } from './routes'
import { healthSummary } from './health'
import { startWorkers } from './workers'

const env = getEnv()
const app = express()

app.disable('x-powered-by')
app.use((_, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff')
	res.setHeader('X-Frame-Options', 'SAMEORIGIN')
	res.setHeader('Referrer-Policy', 'no-referrer')
	next()
})

app.use(requestId)
app.use(tinyRateLimit())
app.use(cors(env.WEB_ORIGIN ? { origin: env.WEB_ORIGIN } : undefined))
app.use(express.json({ limit: '2mb' }))

morgan.token('rid', (req: any) => req.id)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms rid=:rid'))

app.use(apiKeyAuth(env.API_KEY))

app.get('/v1/health', async (_req, res) => {
	const summary = await healthSummary(env)
	res.json(summary)
})

app.post('/v1/enhance', (req, res) => {
	const raw = String((req.body?.prompt ?? '')).trim()
	let prompt = raw
	if (!/\b(photoreal|cinematic|illustration|anime|watercolor|noir)\b/i.test(prompt)) {
		prompt = `${prompt}${prompt ? ', ' : ''}cinematic, high detail`
	}
	const seedPhrases = prompt ? [prompt.split(',')[0].trim()].filter(Boolean) : []
	res.json({ promptEnhanced: prompt || 'a detailed high-quality image, cinematic, high detail', seedPhrases })
})

app.use('/v1', urlAllowlist())
app.use('/v1', routes)

app.use((err: any, req: any, res: any, _next: any) => {
	const code = typeof err?.status === 'number' ? err.status : 500
	res.status(code).json({ error: err?.message || 'internal_error', code, requestId: req?.id })
})

startWorkers()

app.listen(env.API_PORT, () => console.log(`[api] listening on :${env.API_PORT}`))
