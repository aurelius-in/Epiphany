import AWS from 'aws-sdk'
import IORedis from 'ioredis'
import { checkDb } from './db'

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
		const s3 = new AWS.S3({
			endpoint: opts.endpoint,
			s3ForcePathStyle: true,
			accessKeyId: opts.accessKeyId,
			secretAccessKey: opts.secretAccessKey,
			region: opts.region,
			signatureVersion: 'v4',
		}) as AWS.S3
		if (opts.bucket) {
			await s3.headBucket({ Bucket: opts.bucket }).promise()
		}
		return true
	} catch {
		return false
	}
}

export async function healthSummary(env: any) {
	const [dbOk, redisOk, s3Ok] = await Promise.all([
		checkDb(),
		checkRedis(env.REDIS_URL),
		checkS3({ endpoint: env.S3_ENDPOINT, region: env.S3_REGION, accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY, bucket: env.S3_BUCKET })
	])
	return { ok: dbOk && redisOk && s3Ok, services: { db: dbOk, redis: redisOk, s3: s3Ok } }
}
