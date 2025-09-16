import AWS from 'aws-sdk'
import IORedis from 'ioredis'
import { checkDb } from './db'

async function timed<T>(fn: () => Promise<T>) {
	const t0 = Date.now()
	try {
		const v = await fn()
		return { ok: true, ms: Date.now() - t0, v }
	} catch {
		return { ok: false, ms: Date.now() - t0, v: null as any }
	}
}

export async function checkRedis(redisUrl?: string): Promise<boolean> {
	try {
		const redis = new IORedis(redisUrl || 'redis://localhost:6379')
		await redis.ping()
		await redis.quit()
		return true
	} catch {
		return false
	}
}

export async function checkS3(opts: { endpoint?: string, region?: string, accessKeyId?: string, secretAccessKey?: string, bucket?: string }): Promise<boolean> {
	try {
		const s3 = new (AWS.S3 as any)({
			endpoint: opts.endpoint,
			s3ForcePathStyle: true,
			accessKeyId: opts.accessKeyId,
			secretAccessKey: opts.secretAccessKey,
			region: opts.region,
			signatureVersion: 'v4',
		}) as AWS.S3
		if (opts.bucket) {
			await (s3 as any).headBucket({ Bucket: opts.bucket }).promise()
		}
		return true
	} catch {
		return false
	}
}

async function checkHttp(url: string): Promise<boolean> {
	try {
		const res = await fetch(url, { method: 'GET' })
		return res.ok
	} catch {
		return false
	}
}

export async function healthSummary(env: any) {
	const [db, redis, s3, img, vid, edit, explain] = await Promise.all([
		timed(() => checkDb()),
		timed(() => checkRedis(env.REDIS_URL)),
		timed(() => checkS3({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY, bucket: env.S3_BUCKET })),
		timed(() => checkHttp('http://localhost:8001/health')),
		timed(() => checkHttp('http://localhost:8002/health')),
		timed(() => checkHttp('http://localhost:8003/health')),
		timed(() => checkHttp('http://localhost:8004/health')),
	])
	return {
		ok: db.ok && redis.ok && s3.ok && img.ok && vid.ok && edit.ok && explain.ok,
		services: {
			db: db.ok, db_ms: db.ms,
			redis: redis.ok, redis_ms: redis.ms,
			s3: s3.ok, s3_ms: s3.ms,
			infer_image: img.ok, infer_image_ms: img.ms,
			infer_video: vid.ok, infer_video_ms: vid.ms,
			edit: edit.ok, edit_ms: edit.ms,
			explain: explain.ok, explain_ms: explain.ms,
		}
	}
}
