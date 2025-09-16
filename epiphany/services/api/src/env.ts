import 'dotenv/config'

export type AppEnv = {
	API_PORT: number
	DATABASE_URL?: string
	REDIS_URL?: string
	S3_ENDPOINT?: string
	S3_ACCESS_KEY?: string
	S3_SECRET_KEY?: string
	S3_REGION?: string
	S3_BUCKET?: string
	S3_INPUTS_BUCKET?: string
	API_KEY?: string
	ALLOW_NSWF?: boolean
	WEB_ORIGIN?: string
	RATE_LIMIT_MAX?: number
	RATE_LIMIT_WINDOW_MS?: number
	RETENTION_DAYS?: number
}

export function getEnv(): AppEnv {
	return {
		API_PORT: Number(process.env.API_PORT || 4000),
		DATABASE_URL: process.env.DATABASE_URL,
		REDIS_URL: process.env.REDIS_URL,
		S3_ENDPOINT: process.env.S3_ENDPOINT,
		S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
		S3_SECRET_KEY: process.env.S3_SECRET_KEY,
		S3_REGION: process.env.S3_REGION,
		S3_BUCKET: process.env.S3_BUCKET,
		S3_INPUTS_BUCKET: process.env.S3_INPUTS_BUCKET || process.env.S3_BUCKET,
		API_KEY: process.env.API_KEY,
		ALLOW_NSWF: String(process.env.ALLOW_NSWF || 'false').toLowerCase() === 'true',
		WEB_ORIGIN: process.env.WEB_ORIGIN,
		RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX ? Number(process.env.RATE_LIMIT_MAX) : undefined,
		RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? Number(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
		RETENTION_DAYS: process.env.RETENTION_DAYS ? Number(process.env.RETENTION_DAYS) : undefined,
	}
}
