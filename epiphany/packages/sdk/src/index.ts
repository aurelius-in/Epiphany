import { z } from 'zod'

const headers = (apiKey: string) => ({
	'Content-Type': 'application/json',
	'X-API-Key': apiKey,
})

export type Generation = {
	id: string
	kind: 'image' | 'video'
	status: string
	outputUrl?: string | null
	previewUrls?: string[] | null
	createdAt?: string
	inputPrompt?: string | null
	aspect?: string | null
	steps?: number | null
	cfg?: number | null
	seed?: number | null
	modelId?: string | null
	stylePreset?: string | null
	safety?: any | null
}

export type Asset = { id: string, url: string, kind: string, mime: string, bytes?: number|null, width?: number|null, height?: number|null }
export type Event = { id: string, generationId: string, type: string, payload: any, createdAt: string }

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

export async function getJob(baseUrl: string, apiKey: string, id: string, opts?: { signed?: boolean, ttlSec?: number }) {
	const p = new URLSearchParams()
	if (opts?.signed) p.set('signed','1')
	if (opts?.ttlSec) p.set('ttl', String(opts.ttlSec))
	const q = p.toString() ? `?${p.toString()}` : ''
	const r = await fetch(`${baseUrl}/v1/jobs/${id}${q}`, { headers: headers(apiKey) })
	const j = await r.json()
	return jobRes.parse(j)
}

export async function getJobByGeneration(baseUrl: string, apiKey: string, generationId: string) {
	const r = await fetch(`${baseUrl}/v1/jobs/by-generation/${generationId}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function cancelJobByGeneration(baseUrl: string, apiKey: string, generationId: string) {
	const r = await fetch(`${baseUrl}/v1/jobs/by-generation/${generationId}/cancel`, { method: 'POST', headers: headers(apiKey) })
	return await r.json()
}

export async function cancelJob(baseUrl: string, apiKey: string, id: string) {
	const r = await fetch(`${baseUrl}/v1/jobs/${id}`, { method: 'DELETE', headers: headers(apiKey) })
	return await r.json()
}

export function streamJobWithKey(baseUrl: string, apiKey: string, id: string, onEvent: (ev: any) => void) {
	const url = `${baseUrl}/v1/jobs/${id}/stream?key=${encodeURIComponent(apiKey)}`
	const es = new EventSource(url)
	es.onmessage = (e) => { try { onEvent(JSON.parse(e.data)) } catch {} }
	es.onerror = () => { es.close() }
	return es
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

export async function listGenerations(baseUrl: string, apiKey: string, page = 1, limit = 50, opts?: { signed?: boolean, ttlSec?: number }) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (opts?.signed) q.set('signed','1')
	if (opts?.ttlSec) q.set('ttl', String(opts.ttlSec))
	const r = await fetch(`${baseUrl}/v1/generations?${q.toString()}`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ items: z.array(generationSchema), nextPage: z.number().optional() }).parse(j)
}

export async function getGeneration(baseUrl: string, apiKey: string, id: string, opts?: { signed?: boolean, ttlSec?: number }) {
	const p = new URLSearchParams()
	if (opts?.signed) p.set('signed','1')
	if (opts?.ttlSec) p.set('ttl', String(opts.ttlSec))
	const q = p.toString() ? `?${p.toString()}` : ''
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

export async function requestUploadUrl(baseUrl: string, apiKey: string, key?: string, contentType?: string) {
	const r = await fetch(`${baseUrl}/v1/upload-url`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify({ key, contentType }) })
	const j = await r.json()
	return z.object({ key: z.string(), putUrl: z.string(), publicUrl: z.string(), expiresSec: z.number() }).parse(j)
}

export async function putBytesSigned(putUrl: string, bytes: Uint8Array, contentType = 'application/octet-stream') {
	const r = await fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: bytes })
	if (!r.ok) throw new Error(`upload_failed_${r.status}`)
	return true
}

export async function listAssets(baseUrl: string, apiKey: string, page = 1, limit = 100, opts?: { signed?: boolean, ttlSec?: number }) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (opts?.signed) q.set('signed','1')
	if (opts?.ttlSec) q.set('ttl', String(opts.ttlSec))
	const r = await fetch(`${baseUrl}/v1/assets?${q.toString()}`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ items: z.array(z.any()), nextPage: z.number().optional() }).parse(j)
}

export async function listGenerationEvents(baseUrl: string, apiKey: string, generationId: string, page = 1, limit = 100) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) })
	const r = await fetch(`${baseUrl}/v1/generations/${generationId}/events?${q.toString()}`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ items: z.array(z.any()), nextPage: z.number().optional() }).parse(j)
}

export async function deleteAsset(baseUrl: string, apiKey: string, args: { id?: string, url?: string }) {
	const r = await fetch(`${baseUrl}/v1/assets`, { method: 'DELETE', headers: headers(apiKey), body: JSON.stringify(args) })
	const j = await r.json()
	return z.object({ ok: z.boolean() }).parse(j)
}

export async function deleteGeneration(baseUrl: string, apiKey: string, id: string) {
	const r = await fetch(`${baseUrl}/v1/generations/${id}`, { method: 'DELETE', headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ ok: z.boolean(), deletedAssets: z.number().optional() }).parse(j)
}

export async function getMetrics(baseUrl: string, apiKey: string) {
	const r = await fetch(`${baseUrl}/v1/metrics`, { headers: headers(apiKey) })
	const j = await r.json()
	return z.object({ totals: z.object({ generations: z.number(), assets: z.number(), events: z.number(), explains: z.number() }), generationsByStatus: z.object({ succeeded: z.number(), failed: z.number(), queued: z.number() }) }).parse(j)
}

export async function getQueues(baseUrl: string, apiKey: string) {
	const r = await fetch(`${baseUrl}/v1/queues`, { headers: headers(apiKey) })
	return await r.json()
}

export async function refreshExplain(baseUrl: string, apiKey: string, id: string) {
	const r = await fetch(`${baseUrl}/v1/explain/${id}/refresh`, { method: 'POST', headers: headers(apiKey) })
	return await r.json()
}

export async function listErrors(baseUrl: string, apiKey: string, page = 1, limit = 50) {
	const q = new URLSearchParams({ page: String(page), limit: String(limit) })
	const r = await fetch(`${baseUrl}/v1/errors?${q.toString()}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function retryGeneration(baseUrl: string, apiKey: string, id: string) {
	const r = await fetch(`${baseUrl}/v1/retry/${id}`, { method: 'POST', headers: headers(apiKey) })
	return await r.json()
}

export async function getVersion(baseUrl: string, apiKey: string) {
	const r = await fetch(`${baseUrl}/v1/version`, { headers: headers(apiKey) })
	return await r.json()
}

export async function getConfig(baseUrl: string, apiKey: string) {
	const r = await fetch(`${baseUrl}/v1/config`, { headers: headers(apiKey) })
	return await r.json()
}

export async function waitForJob(baseUrl: string, apiKey: string, id: string, opts?: { signed?: boolean, ttlSec?: number, timeoutMs?: number, onProgress?: (p: number) => void }) {
	const timeout = opts?.timeoutMs ?? 120_000
	const start = Date.now()
	let done = false
	try {
		const url = `${baseUrl}/v1/jobs/${id}/stream`
		const es = new EventSource(url, { withCredentials: false } as any)
		es.onmessage = async (e) => {
			try {
				const ev = JSON.parse(e.data)
				if (typeof ev.progress === 'number' && opts?.onProgress) opts.onProgress(ev.progress)
				if (ev.done) {
					es.close()
					done = true
				}
			} catch {}
		}
		es.onerror = () => { try { es.close() } catch {} }
	} catch {}
	while (!done && Date.now() - start < timeout) {
		await new Promise(r => setTimeout(r, 1200))
		const st = await getJob(baseUrl, apiKey, id, { signed: opts?.signed, ttlSec: opts?.ttlSec })
		if (opts?.onProgress && typeof st.progress === 'number') opts.onProgress(st.progress)
		if (st.status === 'succeeded' || st.outputUrl) return st
		if (st.status === 'failed') return st
	}
	return getJob(baseUrl, apiKey, id, { signed: opts?.signed, ttlSec: opts?.ttlSec })
}

export async function getAsset(baseUrl: string, apiKey: string, id: string) {
	const r = await fetch(`${baseUrl}/v1/assets/${id}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function getSignedAssetUrl(baseUrl: string, apiKey: string, id: string, ttlSec = 3600) {
	const r = await fetch(`${baseUrl}/v1/assets/${id}/signed?ttl=${ttlSec}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function signPublicAssetUrl(baseUrl: string, apiKey: string, url: string, ttlSec = 3600) {
	const r = await fetch(`${baseUrl}/v1/assets/sign?url=${encodeURIComponent(url)}&ttl=${ttlSec}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function getServerTime(baseUrl: string, apiKey: string) {
	const r = await fetch(`${baseUrl}/v1/time`, { headers: headers(apiKey) })
	return await r.json()
}

export async function searchAssets(baseUrl: string, apiKey: string, params: { page?: number, limit?: number, kind?: string, mime?: string }) {
	const q = new URLSearchParams()
	if (params.page) q.set('page', String(params.page))
	if (params.limit) q.set('limit', String(params.limit))
	if (params.kind) q.set('kind', params.kind)
	if (params.mime) q.set('mime', params.mime)
	const r = await fetch(`${baseUrl}/v1/assets/search?${q.toString()}`, { headers: headers(apiKey) })
	return await r.json()
}

export async function searchGenerations(baseUrl: string, apiKey: string, qstr: string, page = 1, limit = 50) {
	const q = new URLSearchParams({ q: qstr, page: String(page), limit: String(limit) })
	const r = await fetch(`${baseUrl}/v1/generations/search?${q.toString()}`, { headers: headers(apiKey) })
	return await r.json()
}

export type { z } from 'zod'
