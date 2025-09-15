import { Router } from 'express'
import { z } from 'zod'
import { queues } from './queues'

const r = Router()

r.post('/enhance', async (req, res) => {
	const body = z.object({ prompt: z.string().min(1) }).parse(req.body)
	res.json({ promptEnhanced: body.prompt, seedPhrases: [] })
})

const genImageSchema = z.object({
	prompt: z.string().min(1),
	negativePrompt: z.string().optional(),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	stylePreset: z.string().optional(),
	aspect: z.enum(["1:1","16:9","9:16","3:2","2:3"]).optional(),
	steps: z.number().int().min(1).max(150).optional(),
	cfg: z.number().min(1).max(20).optional(),
	seed: z.number().int().nullable().optional(),
	modelId: z.enum(["sdxl-base","sdxl-refiner","photoreal-xl","anime-xl"]).optional(),
	controlnet: z.object({ type: z.enum(["canny","depth","pose"]), strength: z.number().min(0).max(1).optional(), imageUrl: z.string().url().optional() }).optional(),
	initImageUrl: z.string().url().optional(),
	maskUrl: z.string().url().optional(),
	preview: z.boolean().optional()
})

r.post('/generate/image', async (req, res) => {
	const body = genImageSchema.parse(req.body)
	const job = await queues.generate_image.add('generate', body, { removeOnComplete: true, removeOnFail: true })
	res.json({ id: job.id })
})

const genVideoSchema = z.object({
	prompt: z.string().min(1),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	durationSec: z.union([z.literal(4), z.literal(8), z.literal(12)]).optional(),
	fps: z.union([z.literal(12), z.literal(24)]).optional(),
	resolution: z.enum(["576p","720p"]).optional(),
	seed: z.number().int().nullable().optional(),
	modelId: z.enum(["svd","modelscope-t2v"]).optional(),
	sourceImageUrl: z.string().url().optional()
})

r.post('/generate/video', async (req, res) => {
	const body = genVideoSchema.parse(req.body)
	const job = await queues.generate_video.add('generate', body, { removeOnComplete: true, removeOnFail: true })
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

r.get('/jobs/:id', async (req, res) => {
	// Placeholder job polling
	res.json({ id: req.params.id, status: 'queued' })
})

r.get('/generations', async (_req, res) => {
	res.json({ items: [] })
})

r.get('/explain/:id', async (req, res) => {
	res.json({ id: req.params.id, tokenScores: [], heatmapUrls: [] })
})

export const routes = r
