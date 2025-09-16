import { randomUUID } from 'crypto'
import type { Request, Response, NextFunction } from 'express'

export function requestId(req: Request, _res: Response, next: NextFunction) {
	;(req as any).id = (req.headers['x-request-id'] as string) || randomUUID()
	next()
}

export function apiKeyAuth(apiKey?: string) {
	return function(req: Request, res: Response, next: NextFunction) {
		if (!apiKey) return next()
		const key = (req.header('X-API-Key') || req.header('x-api-key') || (req.query && (req.query as any).key)) as string | undefined
		if (key !== apiKey) return res.status(401).json({ error: 'unauthorized' })
		next()
	}
}

const ipHits = new Map<string,{count:number,resetAt:number}>()
export function tinyRateLimit(maxPerWindow = 120, windowMs = 60_000) {
	return function(req: Request, res: Response, next: NextFunction) {
		const ip = (req.ip || req.connection.remoteAddress || 'unknown') as string
		const now = Date.now()
		let cur = ipHits.get(ip)
		if (!cur || now >= cur.resetAt) {
			cur = { count: 0, resetAt: now + windowMs }
			ipHits.set(ip, cur)
		}
		cur.count++
		const remaining = Math.max(0, maxPerWindow - cur.count)
		res.setHeader('X-RateLimit-Limit', String(maxPerWindow))
		res.setHeader('X-RateLimit-Window', String(windowMs))
		res.setHeader('X-RateLimit-Remaining', String(remaining))
		const resetMs = Math.max(0, cur.resetAt - now)
		res.setHeader('X-RateLimit-Reset', String(resetMs))
		if (cur.count > maxPerWindow) {
			res.setHeader('Retry-After', String(Math.ceil(resetMs/1000)))
			return res.status(429).json({ error: 'rate_limited' })
		}
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
