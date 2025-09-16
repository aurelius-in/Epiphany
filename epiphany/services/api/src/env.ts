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
	API_KEY?: string
	ALLOW_NSWF?: boolean
	WEB_ORIGIN?: string
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
		API_KEY: process.env.API_KEY,
		ALLOW_NSWF: String(process.env.ALLOW_NSWF || 'false').toLowerCase() === 'true',
		WEB_ORIGIN: process.env.WEB_ORIGIN,
	}
}
