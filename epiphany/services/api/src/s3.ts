import AWS from 'aws-sdk'
import { getEnv } from './env'

const env = getEnv()

const s3 = new (AWS.S3 as any)({
	endpoint: env.S3_ENDPOINT,
	s3ForcePathStyle: true,
	accessKeyId: env.S3_ACCESS_KEY,
	secretAccessKey: env.S3_SECRET_KEY,
	region: env.S3_REGION,
	signatureVersion: 'v4',
}) as AWS.S3

export async function putObject(key: string, body: Buffer, contentType?: string): Promise<string> {
	await (s3 as any).putObject({ Bucket: env.S3_BUCKET!, Key: key, Body: body, ContentType: contentType }).promise()
	const endpoint = env.S3_ENDPOINT?.replace('http://', '').replace('https://','')
	return `http://${endpoint}/${env.S3_BUCKET}/${key}`
}

export function getSignedUrl(key: string, expiresSeconds = 3600): string {
	return (s3 as any).getSignedUrl('getObject', { Bucket: env.S3_BUCKET!, Key: key, Expires: expiresSeconds })
}

export function getSignedPutUrl(key: string, contentType?: string, expiresSeconds = 3600, useInputsBucket = false): string {
	const Bucket = (useInputsBucket ? (env.S3_INPUTS_BUCKET || env.S3_BUCKET) : env.S3_BUCKET)!
	return (s3 as any).getSignedUrl('putObject', { Bucket, Key: key, Expires: expiresSeconds, ContentType: contentType })
}

export function publicUrlFor(key: string, useInputsBucket = false): string {
	const endpoint = env.S3_ENDPOINT?.replace('http://', '').replace('https://','')
	const bucket = useInputsBucket ? (env.S3_INPUTS_BUCKET || env.S3_BUCKET) : env.S3_BUCKET
	return `http://${endpoint}/${bucket}/${key}`
}

function parseBucketKeyFromUrl(url: string): { bucket: string, key: string } | null {
	if (!env.S3_ENDPOINT) return null
	const endpoint = env.S3_ENDPOINT.replace(/\/$/, '')
	const prefix = `${endpoint}/`
	if (!url.startsWith(prefix)) return null
	const rest = url.slice(prefix.length)
	const slash = rest.indexOf('/')
	if (slash < 0) return null
	const bucket = rest.slice(0, slash)
	const key = rest.slice(slash + 1)
	return { bucket, key }
}

export function signPublicUrl(url: string, expiresSeconds = 3600): string {
	const parsed = parseBucketKeyFromUrl(url)
	if (!parsed) return url
	return (s3 as any).getSignedUrl('getObject', { Bucket: parsed.bucket, Key: parsed.key, Expires: expiresSeconds })
}

export async function deleteObjectByUrl(url: string): Promise<boolean> {
	const parsed = parseBucketKeyFromUrl(url)
	if (!parsed) return false
	await (s3 as any).deleteObject({ Bucket: parsed.bucket, Key: parsed.key }).promise()
	return true
}
