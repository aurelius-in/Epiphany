import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { getEnv } from './env'
import { requestId, apiKeyAuth } from './middleware'
import { routes } from './routes'
import { healthSummary } from './health'

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

app.use('/v1', routes)

app.listen(env.API_PORT, () => console.log(`[api] listening on :${env.API_PORT}`))
