import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import pino from 'pino'
import pinoHttp from 'pino-http'
import { context, trace } from '@opentelemetry/api'
import compression from 'compression'
import helmet from 'helmet'
import { getEnv } from './env'
import { requestId, apiKeyAuth, tinyRateLimit, urlAllowlist } from './middleware'
import { routes } from './routes'
import { healthSummary } from './health'
import { startWorkers } from './workers'

const env = getEnv()
const app = express()
const logger = pino({ level: process.env.LOG_LEVEL || 'info' })

app.disable('x-powered-by')
app.use(helmet())
app.use((_, res, next) => {
	res.setHeader('X-Content-Type-Options', 'nosniff')
	res.setHeader('X-Frame-Options', 'SAMEORIGIN')
	res.setHeader('Referrer-Policy', 'no-referrer')
	next()
})

app.use(requestId)
app.use((req, res, next) => { res.setHeader('X-Request-Id', (req as any).id || ''); next() })
app.use(pinoHttp({
  logger,
  genReqId: (req: any) => req.id,
  serializers: {
    req: (req: any) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res: any) => ({ statusCode: res.statusCode }),
  },
}))
app.use((req, res, next) => {
  const start = Date.now()
  const tracer = trace.getTracer('epiphany-api')
  const span = tracer.startSpan('http_request', { attributes: { 'http.method': req.method, 'http.target': req.url, 'epiphany.request_id': (req as any).id } })
  res.on('finish', () => {
    try { (req as any).log?.info({ requestId: (req as any).id, durationMs: Date.now() - start }, 'request_finished') } catch {}
    try { span.setAttribute('http.status_code', res.statusCode); span.end() } catch {}
  })
  context.with(trace.setSpan(context.active(), span), () => next())
})
app.use((req, res, next) => {
	const orig = tinyRateLimit(env.RATE_LIMIT_MAX || 120, env.RATE_LIMIT_WINDOW_MS || 60_000)
	return orig(req as any, res as any, (err?: any) => {
		try {
			const windowMs = env.RATE_LIMIT_WINDOW_MS || 60_000
			;(res as any).setHeader('X-RateLimit-Limit', String(env.RATE_LIMIT_MAX || 120))
			;(res as any).setHeader('X-RateLimit-Window', String(windowMs))
		} catch {}
		next(err)
	})
})
const corsOptions = env.WEB_ORIGIN ? {
  origin: env.WEB_ORIGIN,
  methods: ['GET','POST','DELETE','HEAD','OPTIONS'],
  allowedHeaders: ['Content-Type','X-API-Key'],
  exposedHeaders: ['X-Request-Id','X-RateLimit-Limit','X-RateLimit-Window','X-RateLimit-Remaining','X-RateLimit-Reset','Retry-After']
} : undefined
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))
app.use(compression())

morgan.token('rid', (req: any) => req.id)
app.use(morgan(':method :url :status :res[content-length] - :response-time ms rid=:rid'))

app.use(apiKeyAuth(env.API_KEY))

app.get('/v1/health', async (_req, res) => {
	const summary = await healthSummary(env)
	res.json(summary)
})

app.get('/v1/version', (_req, res) => {
	res.json({ name: 'epiphany', version: process.env.npm_package_version || '0.1.0' })
})

app.get('/v1/config', (_req, res) => {
	res.json({
		webOrigin: env.WEB_ORIGIN || null,
		allowNswf: !!env.ALLOW_NSWF,
		rateLimit: { max: env.RATE_LIMIT_MAX || 120, windowMs: env.RATE_LIMIT_WINDOW_MS || 60_000 },
		s3: { endpoint: env.S3_ENDPOINT || null, region: env.S3_REGION || null, bucket: env.S3_BUCKET || null, inputsBucket: env.S3_INPUTS_BUCKET || env.S3_BUCKET || null },
	})
})

app.get('/v1/rate-limit', (_req, res) => {
	res.json({ max: env.RATE_LIMIT_MAX || 120, windowMs: env.RATE_LIMIT_WINDOW_MS || 60_000 })
})

app.get('/v1/time', (_req, res) => res.json({ now: new Date().toISOString() }))
app.get('/v1/ping', (_req, res) => res.json({ pong: true }))
app.get('/v1/system', async (_req, res) => {
	const health = await healthSummary(env)
	const version = { name: 'epiphany', version: process.env.npm_package_version || '0.1.0' }
	const config = {
		webOrigin: env.WEB_ORIGIN || null,
		allowNswf: !!env.ALLOW_NSWF,
		rateLimit: { max: env.RATE_LIMIT_MAX || 120, windowMs: env.RATE_LIMIT_WINDOW_MS || 60_000 },
		s3: { endpoint: env.S3_ENDPOINT || null, region: env.S3_REGION || null, bucket: env.S3_BUCKET || null, inputsBucket: env.S3_INPUTS_BUCKET || env.S3_BUCKET || null },
	}
	res.json({ health, version, config })
})
app.get('/v1/_routes', (req, res) => {
	const list: any[] = []
	function collect(stack: any[], base = '') {
		for (const layer of stack) {
			if (layer.route && layer.route.path) {
				const methods = Object.keys(layer.route.methods || {}).filter(Boolean)
				list.push({ path: base + layer.route.path, methods })
			}
			if (layer.handle && layer.handle.stack) collect(layer.handle.stack, base + (layer.regexp?.fast_slash ? '' : ''))
		}
	}
	collect((req.app as any)._router.stack)
	res.json({ routes: list })
})

const startedAt = Date.now()
app.get('/v1/uptime', (_req, res) => res.json({ startedAt, uptimeMs: Date.now() - startedAt }))

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
	const isZod = !!(err?.issues && Array.isArray(err.issues))
	const code = isZod ? 400 : (typeof err?.status === 'number' ? err.status : 500)
	res.status(code).json({ error: err?.message || (isZod ? 'invalid_request' : 'internal_error'), code, requestId: req?.id, issues: isZod ? err.issues : undefined })
})

app.use((_req, res) => {
	res.status(404).json({ error: 'not_found' })
})

startWorkers()

app.listen(env.API_PORT, () => console.log(`[api] listening on :${env.API_PORT}`))
