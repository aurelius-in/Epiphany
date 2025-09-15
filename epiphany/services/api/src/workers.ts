import { Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import { postJson } from './http'
import { prisma } from './db'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

async function processGenerateImage(job: Job) {
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
	const resp = await postJson<any>('http://localhost:8001/infer/txt2img', job.data)
	await prisma.generation.update({ where: { id: job.data.generationId }, data: {
		status: 'succeeded', outputUrl: resp.output_url || null, previewUrls: resp.preview_urls || [], durationMs: resp.duration_ms || null, modelHash: resp.model_hash || null, safety: resp.safety_scores || null,
	} })
	return resp
}

async function processGenerateVideo(job: Job) {
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
	const resp = await postJson<any>('http://localhost:8002/infer/t2v', job.data)
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'succeeded', outputUrl: resp.output_url || null, durationMs: resp.duration_ms || null, modelHash: resp.model_hash || null } })
	return resp
}

async function processEdit(job: Job) {
	const resp = await postJson<any>('http://localhost:8003/upscale', job.data)
	return resp
}

async function processExplain(job: Job) {
	const resp = await postJson<any>('http://localhost:8004/attention/placeholder', job.data)
	return resp
}

export function startWorkers() {
	new Worker('generate_image', processGenerateImage, { connection })
	new Worker('generate_video', processGenerateVideo, { connection })
	new Worker('edit_image', processEdit, { connection })
	new Worker('explain', processExplain, { connection })
}
