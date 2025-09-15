import AWS from 'aws-sdk'
import { getEnv } from './env'

const env = getEnv()

const s3 = new AWS.S3({
	endpoint: env.S3_ENDPOINT,
	s3ForcePathStyle: true,
	accessKeyId: env.S3_ACCESS_KEY,
	secretAccessKey: env.S3_SECRET_KEY,
	region: env.S3_REGION,
	signatureVersion: 'v4',
}) as AWS.S3

export async function putObject(key: string, body: Buffer, contentType?: string): Promise<string> {
	await s3.putObject({ Bucket: env.S3_BUCKET!, Key: key, Body: body, ContentType: contentType }).promise()
	const endpoint = env.S3_ENDPOINT?.replace('http://', '').replace('https://','')
	return `http://${endpoint}/${env.S3_BUCKET}/${key}`
}
