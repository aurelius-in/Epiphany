import { Worker, Job, Queue } from 'bullmq'
import IORedis from 'ioredis'
import { postJson, getJson } from './http'
import { prisma } from './db'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')
const explainQueue = new Queue('explain', { connection })

function selectImageEndpoint(data: any): string {
	if (data?.controlnet?.type) return 'http://localhost:8001/infer/controlnet'
	if (data?.maskUrl) return 'http://localhost:8001/infer/inpaint'
	if (data?.initImageUrl) return 'http://localhost:8001/infer/img2img'
	return 'http://localhost:8001/infer/txt2img'
}

async function processGenerateImage(job: Job) {
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
	const url = selectImageEndpoint(job.data)
	const resp = await postJson<any>(url, job.data)
	await prisma.generation.update({ where: { id: job.data.generationId }, data: {
		status: 'succeeded', outputUrl: resp.output_url || null, previewUrls: resp.preview_urls || [], durationMs: resp.duration_ms || null, modelHash: resp.model_hash || null, safety: resp.safety_scores || null,
	} })
	if (resp.output_url) {
		await prisma.asset.create({ data: { url: resp.output_url, kind: 'image', mime: 'image/png' } })
	}
	const ex = await explainQueue.add('explain', { generationId: job.data.generationId }, { removeOnComplete: true, removeOnFail: true })
	return { ...resp, explain_id: ex.id }
}

async function processGenerateVideo(job: Job) {
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
	const resp = await postJson<any>('http://localhost:8002/infer/t2v', job.data)
	await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'succeeded', outputUrl: resp.output_url || null, durationMs: resp.duration_ms || null, modelHash: resp.model_hash || null } })
	if (resp.output_url) {
		await prisma.asset.create({ data: { url: resp.output_url, kind: 'video', mime: 'video/mp4' } })
	}
	return resp
}

async function processEdit(job: Job) {
	const task = String(job.name)
	const map: Record<string,string> = {
		'upscale': 'http://localhost:8003/upscale',
		'restore-face': 'http://localhost:8003/restore-face',
		'remove-bg': 'http://localhost:8003/remove-bg',
		'crop': 'http://localhost:8003/crop',
		'resize': 'http://localhost:8003/resize',
	}
	const url = map[task] || 'http://localhost:8003/upscale'
	const resp = await postJson<any>(url, job.data)
	if (resp.output_url) {
		await prisma.asset.create({ data: { url: resp.output_url, kind: 'image', mime: 'image/png' } })
	}
	return resp
}

async function processExplain(job: Job) {
	const attn = await getJson<any>('http://localhost:8004/attention/' + (job.data?.generationId || 'x'))
	const tokens = await getJson<any>('http://localhost:8004/tokens/' + (job.data?.generationId || 'x'))
	const tokenScores = (tokens && (tokens.token_scores ?? (tokens as any)['token_scores'])) || []
	const heatmapUrls = (attn && (attn.heatmap_urls ?? (attn as any)['heatmap_urls'])) || []
	const explain = await prisma.explain.create({ data: { generationId: job.data?.generationId || 'x', tokenScores, heatmapUrls } as any })
	return { explain_id: explain.id }
}

export function startWorkers() {
	new Worker('generate_image', processGenerateImage, { connection })
	new Worker('generate_video', processGenerateVideo, { connection })
	new Worker('edit_image', processEdit, { connection })
	new Worker('explain', processExplain, { connection })
}
