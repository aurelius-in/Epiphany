import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function requestId(req: Request, _res: Response, next: NextFunction) {
	;(req as any).id = (req.headers['x-request-id'] as string) || randomUUID()
	next()
}

export function apiKeyAuth(apiKey?: string) {
	return function(req: Request, res: Response, next: NextFunction) {
		if (!apiKey) return next()
		const key = req.header('X-API-Key') || req.header('x-api-key')
		if (key !== apiKey) return res.status(401).json({ error: 'unauthorized' })
		next()
	}
}

const ipHits = new Map<string,{count:number,resetAt:number}>()
export function tinyRateLimit(maxPerWindow = 120, windowMs = 60_000) {
	return function(req: Request, res: Response, next: NextFunction) {
		const ip = (req.ip || req.connection.remoteAddress || 'unknown') as string
		const now = Date.now()
		const cur = ipHits.get(ip)
		if (!cur || now >= cur.resetAt) {
			ipHits.set(ip, { count: 1, resetAt: now + windowMs })
			return next()
		}
		if (cur.count >= maxPerWindow) return res.status(429).json({ error: 'rate_limited' })
		cur.count++
		next()
	}
}

export function urlAllowlist(prefixesCsv?: string) {
	const prefixes = (prefixesCsv || process.env.ALLOWED_URL_PREFIXES || '')
		.split(',').map(s => s.trim()).filter(Boolean)
	return function(req: Request, res: Response, next: NextFunction) {
		if (prefixes.length === 0) return next()
		const urls: string[] = []
		const body: any = req.body || {}
		if (body.initImageUrl) urls.push(String(body.initImageUrl))
		if (body.maskUrl) urls.push(String(body.maskUrl))
		if (body.controlnet?.imageUrl) urls.push(String(body.controlnet.imageUrl))
		if (body.imageUrl) urls.push(String(body.imageUrl))
		for (const u of urls) {
			if (!prefixes.some(p => u.startsWith(p))) {
				return res.status(400).json({ error: 'url_not_allowed' })
			}
		}
		next()
	}
}
