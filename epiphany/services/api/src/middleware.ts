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
