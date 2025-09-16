import { z } from 'zod'

const headers = (apiKey: string) => ({
	'Content-Type': 'application/json',
	'X-API-Key': apiKey,
})

export const enhanceReq = z.object({ prompt: z.string().min(1).max(2000) })
export const enhanceRes = z.object({ promptEnhanced: z.string(), seedPhrases: z.array(z.string()) })

export const jobRes = z.object({
	id: z.string(),
	status: z.string(),
	progress: z.number().optional(),
	outputUrl: z.string().url().optional(),
	previewUrls: z.array(z.string()).optional(),
	explainId: z.string().optional(),
	caption: z.string().optional(),
	error: z.string().optional(),
})

export async function enhance(baseUrl: string, apiKey: string, prompt: string) {
	const body = enhanceReq.parse({ prompt })
	const r = await fetch(`${baseUrl}/v1/enhance`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) })
	const j = await r.json()
	return enhanceRes.parse(j)
}

export async function getJob(baseUrl: string, apiKey: string, id: string, opts?: { signed?: boolean }) {
	const q = opts?.signed ? '?signed=1' : ''
	const r = await fetch(`${baseUrl}/v1/jobs/${id}${q}`, { headers: headers(apiKey) })
	const j = await r.json()
	return jobRes.parse(j)
}

const aspectEnum = z.enum(["1:1","16:9","9:16","3:2","2:3"]) as unknown as z.ZodEnum<["1:1","16:9","9:16","3:2","2:3"]>

export const genImageReq = z.object({
	prompt: z.string(),
	negativePrompt: z.string().optional(),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	stylePreset: z.string().optional(),
	aspect: aspectEnum.optional(),
	steps: z.number().optional(),
	cfg: z.number().optional(),
	seed: z.number().nullable().optional(),
	modelId: z.enum(["sdxl-base","sdxl-refiner","photoreal-xl","anime-xl"]).optional(),
	controlnet: z.object({ type: z.enum(["canny","depth","pose"]), strength: z.number().optional(), imageUrl: z.string().url().optional() }).optional(),
	initImageUrl: z.string().url().optional(),
	maskUrl: z.string().url().optional(),
	preview: z.boolean().optional(),
})

export async function generateImage(baseUrl: string, apiKey: string, req: z.infer<typeof genImageReq>) {
	const body = genImageReq.parse(req)
	const r = await fetch(`${baseUrl}/v1/generate/image`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) })
	const j = await r.json()
	return z.object({ id: z.string() }).parse(j)
}

export const genVideoReq = z.object({
	prompt: z.string(),
	mode: z.union([z.literal(0), z.literal(1), z.literal(2)]),
	durationSec: z.union([z.literal(4), z.literal(8), z.literal(12)]).optional(),
	fps: z.union([z.literal(12), z.literal(24)]).optional(),
	resolution: z.enum(["576p","720p"]).optional(),
	seed: z.number().nullable().optional(),
	modelId: z.enum(["svd","modelscope-t2v"]).optional(),
	sourceImageUrl: z.string().url().optional(),
})

export async function generateVideo(baseUrl: string, apiKey: string, req: z.infer<typeof genVideoReq>) {
	const body = genVideoReq.parse(req)
	const r = await fetch(`${baseUrl}/v1/generate/video`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) })
	const j = await r.json()
	return z.object({ id: z.string() }).parse(j)
}

const generationSchema = z.object({
	id: z.string(),
	kind: z.enum(['image','video']),
	status: z.string(),
	outputUrl: z.string().nullable().optional(),
	previewUrls: z.array(z.string()).nullable().optional(),
	createdAt: z.string().nullable().optional(),
	inputPrompt: z.string().nullable().optional(),
	aspect: z.string().nullable().optional(),
	steps: z.number().nullable().optional(),
	cfg: z.number().nullable().optional(),
	seed: z.number().nullable().optional(),
	modelId: z.string().nullable().optional(),
	stylePreset: z.string().nullable().optional(),
	safety: z.any().nullable().optional(),
})

export async function listGenerations(baseUrl: string, apiKey: string, page = 1, limit = 50, opts?: { signed?: boolean }) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (opts?.signed) q.set('signed','1')
	const r = await fetch(`${baseUrl}/v1/generations?${q.toString()}`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ items: z.array(generationSchema), nextPage: z.number().optional() }).parse(j)
}

export async function getGeneration(baseUrl: string, apiKey: string, id: string, opts?: { signed?: boolean }) {
	const q = opts?.signed ? '?signed=1' : ''
	const r = await fetch(`${baseUrl}/v1/generations/${id}${q}`, { headers: headers(apiKey) })
	const j = await r.json()
	return generationSchema.parse(j)
}

// Edit helpers
export async function upscale(baseUrl: string, apiKey: string, imageUrl: string, scale: 2|4) {
	const r = await fetch(`${baseUrl}/v1/edit/upscale`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl, scale }) })
	return z.object({ id: z.string() }).parse(await r.json())
}
export async function restoreFace(baseUrl: string, apiKey: string, imageUrl: string) {
	const r = await fetch(`${baseUrl}/v1/edit/restore-face`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl }) })
	return z.object({ id: z.string() }).parse(await r.json())
}
export async function removeBg(baseUrl: string, apiKey: string, imageUrl: string) {
	const r = await fetch(`${baseUrl}/v1/edit/remove-bg`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl }) })
	return z.object({ id: z.string() }).parse(await r.json())
}
export async function crop(baseUrl: string, apiKey: string, imageUrl: string, x: number, y: number, w: number, h: number) {
	const r = await fetch(`${baseUrl}/v1/edit/crop`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl, x, y, w, h }) })
	return z.object({ id: z.string() }).parse(await r.json())
}
export async function resize(baseUrl: string, apiKey: string, imageUrl: string, width: number, height: number) {
	const r = await fetch(`${baseUrl}/v1/edit/resize`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl, width, height }) })
	return z.object({ id: z.string() }).parse(await r.json())
}
export async function caption(baseUrl: string, apiKey: string, imageUrl: string) {
	const r = await fetch(`${baseUrl}/v1/edit/caption`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ imageUrl }) })
	return z.object({ id: z.string() }).parse(await r.json())
}

export async function listEvents(baseUrl: string, apiKey: string, params?: { generationId?: string, page?: number, limit?: number }) {
	const q = new URLSearchParams()
	if (params?.generationId) q.set('generationId', params.generationId)
	if (params?.page) q.set('page', String(params.page))
	if (params?.limit) q.set('limit', String(params.limit))
	const r = await fetch(`${baseUrl}/v1/events?${q.toString()}`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ items: z.array(z.any()), nextPage: z.number().optional() }).parse(j)
}

export async function streamJob(baseUrl: string, apiKey: string, id: string, onEvent: (ev: any) => void) {
	const url = `${baseUrl}/v1/jobs/${id}/stream`
	const es = new EventSource(url, { withCredentials: false } as any)
	es.onmessage = (e) => {
		try { onEvent(JSON.parse(e.data)) } catch { /* noop */ }
	}
	es.onerror = () => { es.close() }
	return es
}
