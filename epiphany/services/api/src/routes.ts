import { Router } from 'express'
import { z } from 'zod'
import { queues } from './queues'
import { Job } from 'bullmq'
import { prisma } from './db'
import { getEnv } from './env'
import { getSignedUrl } from './s3'
import { getSignedPutUrl, publicUrlFor } from './s3'

const env = getEnv()
const r = Router()

function maybeSign(url?: string | null, signed?: boolean): string | undefined {
	if (!url) return undefined
	if (!signed) return url || undefined
	try {
		const prefix = `${env.S3_ENDPOINT?.replace(/\/$/, '')}/${env.S3_BUCKET}`
		const key = url.replace(prefix + '/', '')
		return getSignedUrl(key)
	} catch {
		return url || undefined
	}
}

r.post('/enhance', async (req, res) => {
	const body = z.object({ prompt: z.string().min(1).max(2000) }).parse(req.body)
	res.json({ promptEnhanced: body.prompt, seedPhrases: [] })
})

const genImageSchema = z.object({
	prompt: z.string().min(1).max(2000),
	negativePrompt: z.string().max(2000).optional(),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	stylePreset: z.string().max(120).optional(),
	aspect: z.enum(["1:1","16:9","9:16","3:2","2:3"]).optional(),
	steps: z.number().int().min(4).max(120).optional(),
	cfg: z.number().min(1).max(20).optional(),
	seed: z.number().int().min(0).max(2_147_483_647).nullable().optional(),
	modelId: z.enum(["sdxl-base","sdxl-refiner","photoreal-xl","anime-xl"]).optional(),
	controlnet: z.object({ type: z.enum(["canny","depth","pose"]), strength: z.number().min(0).max(1).optional(), imageUrl: z.string().url().optional() }).optional(),
	initImageUrl: z.string().url().optional(),
	maskUrl: z.string().url().optional(),
	preview: z.boolean().optional()
})

r.post('/generate/image', async (req, res) => {
	const body = genImageSchema.parse(req.body)
	const modeFinal = body.mode === 2 && !env.ALLOW_NSWF ? 1 : body.mode
	const generation = await prisma.generation.create({ data: {
		kind: 'image',
		status: 'queued',
		inputPrompt: body.prompt,
		negativePrompt: body.negativePrompt || null as any,
		mode: modeFinal,
		aspect: body.aspect || null as any,
		steps: body.steps || null as any,
		cfg: body.cfg || null as any,
		seed: body.seed != null ? BigInt(body.seed) : null as any,
		modelId: body.modelId || null as any,
		stylePreset: body.stylePreset || null as any,
		controlnet: body.controlnet || null as any,
		initImageUrl: body.initImageUrl || null as any,
		maskUrl: body.maskUrl || null as any,
		outputUrl: null as any,
		previewUrls: [],
		durationMs: null as any,
		modelHash: null as any,
		safety: null as any,
		error: null as any,
	} })
	await prisma.event.create({ data: { generationId: generation.id, type: 'enqueue', payload: body as any } })
	const job = await queues.generate_image.add('generate', { ...body, mode: modeFinal, generationId: generation.id }, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

const genVideoSchema = z.object({
	prompt: z.string().min(1).max(2000),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	durationSec: z.union([z.literal(4), z.literal(8), z.literal(12)]).optional(),
	fps: z.union([z.literal(12), z.literal(24)]).optional(),
	resolution: z.enum(["576p","720p"]).optional(),
	seed: z.number().int().min(0).max(2_147_483_647).nullable().optional(),
	modelId: z.enum(["svd","modelscope-t2v"]).optional(),
	sourceImageUrl: z.string().url().optional()
})

r.post('/generate/video', async (req, res) => {
	const body = genVideoSchema.parse(req.body)
	const modeFinal = body.mode === 2 && !env.ALLOW_NSWF ? 1 : body.mode
	const generation = await prisma.generation.create({ data: {
		kind: 'video',
		status: 'queued',
		inputPrompt: body.prompt,
		negativePrompt: null as any,
		mode: modeFinal,
		aspect: body.resolution || null as any,
		steps: null as any,
		cfg: null as any,
		seed: body.seed != null ? BigInt(body.seed) : null as any,
		modelId: body.modelId || null as any,
		stylePreset: null as any,
		controlnet: null as any,
		initImageUrl: body.sourceImageUrl || null as any,
		maskUrl: null as any,
		outputUrl: null as any,
		previewUrls: [],
		durationMs: null as any,
		modelHash: null as any,
		safety: null as any,
		error: null as any,
	} })
	await prisma.event.create({ data: { generationId: generation.id, type: 'enqueue', payload: body as any } })
	const job = await queues.generate_video.add('generate', { ...body, mode: modeFinal, generationId: generation.id }, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/upscale', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url(), scale: z.union([z.literal(2), z.literal(4)]) }).parse(req.body)
	const job = await queues.edit_image.add('upscale', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/restore-face', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url() }).parse(req.body)
	const job = await queues.edit_image.add('restore-face', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/remove-bg', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url() }).parse(req.body)
	const job = await queues.edit_image.add('remove-bg', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/crop', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url(), x: z.number(), y: z.number(), w: z.number(), h: z.number() }).parse(req.body)
	const job = await queues.edit_image.add('crop', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/resize', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url(), width: z.number().int().min(1), height: z.number().int().min(1) }).parse(req.body)
	const job = await queues.edit_image.add('resize', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/edit/caption', async (req, res) => {
	const body = z.object({ imageUrl: z.string().url() }).parse(req.body)
	const job = await queues.edit_image.add('caption', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

r.post('/upload-url', async (req, res) => {
	const body = z.object({ key: z.string().min(1).optional(), contentType: z.string().optional() }).parse(req.body || {})
	const key = body.key || `inputs/${Date.now()}_${Math.random().toString(36).slice(2)}.bin`
	const contentType = body.contentType || 'application/octet-stream'
	const putUrl = getSignedPutUrl(key, contentType, 3600, true)
	const publicUrl = publicUrlFor(key, true)
	res.json({ key, putUrl, publicUrl, expiresSec: 3600 })
})

r.get('/jobs/:id', async (req, res) => {
	const id = req.params.id
	const signed = String(req.query.signed || '0') === '1'
	async function statusOf(qname: keyof typeof queues): Promise<Job | null> {
		return queues[qname].getJob(id)
	}
	const job = (await statusOf('generate_image')) || (await statusOf('generate_video')) || (await statusOf('edit_image')) || (await statusOf('explain'))
	if (!job) return res.status(404).json({ error: 'not_found' })
	const state = await job.getState()
	const progress = (job.progress as any) || 0
	const result = (await job.getReturnValue().catch(() => null)) as any
	const failedReason = (job as any).failedReason || undefined
	const statusMap: Record<string,string> = { waiting: 'queued', delayed: 'queued', active: 'running', completed: 'succeeded', failed: 'failed', paused: 'queued' }
	const outputUrl = result?.output_url
	const previewUrls = Array.isArray(result?.preview_urls) ? result.preview_urls : undefined
	res.json({ id, status: statusMap[state] || state, progress, outputUrl: signed ? maybeSign(outputUrl, true) : outputUrl, previewUrls: signed && previewUrls ? previewUrls.map((u: string) => maybeSign(u, true)) : previewUrls, explainId: result?.explain_id, caption: result?.caption, error: failedReason })
})

r.get('/jobs/:id/stream', async (req, res) => {
	res.setHeader('Content-Type', 'text/event-stream')
	res.setHeader('Cache-Control', 'no-cache')
	res.setHeader('Connection', 'keep-alive')
	const id = String(req.params.id)
	function send(event: any) {
		res.write(`data: ${JSON.stringify(event)}\n\n`)
	}
	let closed = false
	req.on('close', () => { closed = true })
	const interval = setInterval(async () => {
		if (closed) { clearInterval(interval); return }
		const statusOf = async (qname: keyof typeof queues) => queues[qname].getJob(id)
		const job = (await statusOf('generate_image')) || (await statusOf('generate_video')) || (await statusOf('edit_image')) || (await statusOf('explain'))
		if (!job) { send({ id, status: 'not_found' }); clearInterval(interval); res.end(); return }
		const state = await job.getState()
		const progress = (job.progress as any) || 0
		send({ id, state, progress })
		if (state === 'completed' || state === 'failed') {
			const result = (await job.getReturnValue().catch(() => null)) as any
			send({ id, done: true, state, result })
			clearInterval(interval)
			res.end()
		}
	}, 700)
})

r.post('/jobs/:id/cancel', async (req, res) => {
	const id = String(req.params.id)
	const found: Job[] = []
	for (const q of Object.values(queues)) {
		const j = await (q as any).getJob(id)
		if (j) found.push(j)
	}
	if (found.length === 0) return res.status(404).json({ error: 'not_found' })
	await Promise.all(found.map(async j => {
		try { await j.remove() } catch {}
		const genId = (j.data && j.data.generationId) ? String(j.data.generationId) : null
		if (genId) {
			try {
				await prisma.generation.update({ where: { id: genId }, data: { status: 'canceled' } })
				await prisma.event.create({ data: { generationId: genId, type: 'canceled', payload: { jobId: j.id } as any } })
			} catch {}
		}
	}))
	res.json({ id, cancelled: true })
})

r.get('/generations', async (req, res) => {
	const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
	const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || '50')) || 50))
	const signed = String(req.query.signed || '0') === '1'
	const items = await prisma.generation.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
	const nextPage = items.length === limit ? page + 1 : undefined
	const mapped = items.map((g: any) => {
		return {
			...g,
			outputUrl: signed ? maybeSign(g.outputUrl, true) : g.outputUrl,
			previewUrls: signed && Array.isArray(g.previewUrls) ? g.previewUrls.map((u: string) => maybeSign(u, true)) : g.previewUrls,
		}
	})
	res.json({ items: mapped, nextPage })
})

r.get('/generations/:id', async (req, res) => {
	const id = String(req.params.id)
	const signed = String(req.query.signed || '0') === '1'
	const gen = await prisma.generation.findUnique({ where: { id } }).catch(() => null)
	if (!gen) return res.status(404).json({ error: 'not_found' })
	const out = { ...gen, outputUrl: signed ? maybeSign(gen.outputUrl || undefined, true) : gen.outputUrl, previewUrls: signed && Array.isArray(gen.previewUrls) ? gen.previewUrls.map(u => maybeSign(u, true)) : gen.previewUrls }
	res.json(out)
})

r.get('/generations/:id/events', async (req, res) => {
	const id = String(req.params.id)
	const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
	const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || '100')) || 100))
	const items = await prisma.event.findMany({ where: { generationId: id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
	const nextPage = items.length === limit ? page + 1 : undefined
	res.json({ items, nextPage })
})

r.get('/explain/:id', async (req, res) => {
	const id = req.params.id
	const byId = await prisma.explain.findUnique({ where: { id } }).catch(() => null)
	if (byId) return res.json({ id: byId.id, tokenScores: byId.tokenScores as any, heatmapUrls: byId.heatmapUrls as any })
	const byGen = await prisma.explain.findFirst({ where: { generationId: id }, orderBy: { /* latest first */ id: 'desc' as any } }).catch(() => null)
	if (byGen) return res.json({ id: byGen.id, tokenScores: byGen.tokenScores as any, heatmapUrls: byGen.heatmapUrls as any })
	return res.status(404).json({ error: 'not_found' })
})

r.get('/events', async (req, res) => {
	const generationId = req.query.generationId ? String(req.query.generationId) : undefined
	const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
	const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || '100')) || 100))
	const where = generationId ? { generationId } : {}
	const items = await prisma.event.findMany({ where: where as any, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit })
	const nextPage = items.length === limit ? page + 1 : undefined
	res.json({ items, nextPage })
})

r.get('/assets', async (req, res) => {
	const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
	const limit = Math.max(1, Math.min(200, parseInt(String(req.query.limit || '100')) || 100))
	const signed = String(req.query.signed || '0') === '1'
	const items = await prisma.asset.findMany({ orderBy: { id: 'desc' as any }, skip: (page - 1) * limit, take: limit })
	const nextPage = items.length === limit ? page + 1 : undefined
	const mapped = items.map((a: any) => ({ ...a, url: signed ? maybeSign(a.url, true) : a.url }))
	res.json({ items: mapped, nextPage })
})

r.delete('/assets', async (req, res) => {
	const body = z.object({ id: z.string().optional(), url: z.string().url().optional() }).parse(req.body || {})
	let where: any = {}
	if (body.id) where.id = body.id
	if (body.url) where.url = body.url
	if (!where.id && !where.url) return res.status(400).json({ error: 'missing_id_or_url' })
	const asset = await prisma.asset.findFirst({ where }).catch(() => null)
	if (!asset) return res.status(404).json({ error: 'not_found' })
	try { await (await import('./s3')).deleteObjectByUrl(asset.url) } catch {}
	await prisma.asset.delete({ where: { id: asset.id } })
	res.json({ ok: true })
})

export const routes = r
