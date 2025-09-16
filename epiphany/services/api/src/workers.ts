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
	const t0 = Date.now()
	try {
		await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
		await job.updateProgress(10)
		const url = selectImageEndpoint(job.data)
		const resp = await postJson<any>(url, job.data)
		await job.updateProgress(90)
		const durationMs = resp.duration_ms || (Date.now() - t0)
		await prisma.generation.update({ where: { id: job.data.generationId }, data: {
			status: 'succeeded', outputUrl: resp.output_url || null, previewUrls: resp.preview_urls || [], durationMs, modelHash: resp.model_hash || null, safety: resp.safety_scores || null,
		} })
		await prisma.event.create({ data: { generationId: job.data.generationId, type: 'succeeded', payload: { jobId: job.id, durationMs } as any } })
		if (resp.output_url) {
			const meta = (resp as any).image_meta || {}
			await prisma.asset.create({ data: { url: resp.output_url, kind: 'image', mime: 'image/png', width: meta.width || null as any, height: meta.height || null as any, bytes: meta.bytes || null as any, sha256: meta.sha256 || null as any } })
		}
		if (Array.isArray(resp.preview_urls)) {
			for (const p of resp.preview_urls) {
				await prisma.asset.create({ data: { url: p, kind: 'image', mime: 'image/png' } })
			}
		}
		const ex = await explainQueue.add('explain', { generationId: job.data.generationId }, { removeOnComplete: true, removeOnFail: true })
		await job.updateProgress(100)
		return { ...resp, explain_id: ex.id }
	} catch (err: any) {
		await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'failed', error: String(err?.message || err) } })
		await prisma.event.create({ data: { generationId: job.data.generationId, type: 'failed', payload: { jobId: job.id, error: String(err?.message || err) } as any } })
		throw err
	}
}

async function processGenerateVideo(job: Job) {
	const t0 = Date.now()
	try {
		await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'running' } })
		await job.updateProgress(10)
		const resp = await postJson<any>('http://localhost:8002/infer/t2v', job.data)
		await job.updateProgress(90)
		const durationMs = resp.duration_ms || (Date.now() - t0)
		await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'succeeded', outputUrl: resp.output_url || null, durationMs, modelHash: resp.model_hash || null } })
		await prisma.event.create({ data: { generationId: job.data.generationId, type: 'succeeded', payload: { jobId: job.id, durationMs } as any } })
		if (resp.output_url) {
			const meta = (resp as any).video_meta || {}
			await prisma.asset.create({ data: { url: resp.output_url, kind: 'video', mime: 'video/mp4', bytes: meta.bytes || null as any, sha256: meta.sha256 || null as any } })
		}
		await job.updateProgress(100)
		return resp
	} catch (err: any) {
		await prisma.generation.update({ where: { id: job.data.generationId }, data: { status: 'failed', error: String(err?.message || err) } })
		await prisma.event.create({ data: { generationId: job.data.generationId, type: 'failed', payload: { jobId: job.id, error: String(err?.message || err) } as any } })
		throw err
	}
}

async function processEdit(job: Job) {
	try {
		await job.updateProgress(10)
		const task = String(job.name)
		const map: Record<string,string> = {
			'upscale': 'http://localhost:8003/upscale',
			'restore-face': 'http://localhost:8003/restore-face',
			'remove-bg': 'http://localhost:8003/remove-bg',
			'crop': 'http://localhost:8003/crop',
			'resize': 'http://localhost:8003/resize',
			'caption': 'http://localhost:8003/caption',
		}
		const url = map[task] || 'http://localhost:8003/upscale'
		const resp = await postJson<any>(url, job.data)
		if (resp.output_url) {
			await prisma.asset.create({ data: { url: resp.output_url, kind: 'image', mime: 'image/png' } })
		}
		await job.updateProgress(100)
		return resp
	} catch (err: any) {
		throw err
	}
}

async function processExplain(job: Job) {
	try {
		await job.updateProgress(10)
		const attn = await getJson<any>('http://localhost:8004/attention/' + (job.data?.generationId || 'x'))
		const tokens = await getJson<any>('http://localhost:8004/tokens/' + (job.data?.generationId || 'x'))
		const tokenScores = (tokens && (tokens.token_scores ?? (tokens as any)['token_scores'])) || []
		const heatmapUrls = (attn && (attn.heatmap_urls ?? (attn as any)['heatmap_urls'])) || []
		const explain = await prisma.explain.create({ data: { generationId: job.data?.generationId || 'x', tokenScores, heatmapUrls } as any })
		await job.updateProgress(100)
		return { explain_id: explain.id }
	} catch (err: any) {
		throw err
	}
}

export function startWorkers() {
	new Worker('generate_image', processGenerateImage, { connection })
	new Worker('generate_video', processGenerateVideo, { connection })
	new Worker('edit_image', processEdit, { connection })
	new Worker('explain', processExplain, { connection })
}
