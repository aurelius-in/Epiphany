import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
const API_KEY = process.env.API_KEY || 'dev'

async function forward(req: NextRequest, path: string) {
	const url = `${API_BASE}/${path}`
	const headers: Record<string,string> = {}
	req.headers.forEach((v, k) => { if (!['host'].includes(k)) headers[k] = v })
	headers['X-API-Key'] = API_KEY

	const init: RequestInit = { method: req.method, headers }
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		const body = await req.text()
		init.body = body
	}
	const res = await fetch(url, init)
	const passHeaders: Record<string,string> = {}
	const ct = res.headers.get('content-type') || ''
	if (ct) passHeaders['Content-Type'] = ct
	passHeaders['Cache-Control'] = res.headers.get('cache-control') || 'no-cache'
	const xrid = res.headers.get('x-request-id'); if (xrid) passHeaders['X-Request-Id'] = xrid
	const xl = res.headers.get('x-ratelimit-limit'); if (xl) passHeaders['X-RateLimit-Limit'] = xl
	const xr = res.headers.get('x-ratelimit-remaining'); if (xr) passHeaders['X-RateLimit-Remaining'] = xr
	const xw = res.headers.get('x-ratelimit-window'); if (xw) passHeaders['X-RateLimit-Window'] = xw
	const xrs = res.headers.get('x-ratelimit-reset'); if (xrs) passHeaders['X-RateLimit-Reset'] = xrs
	return new NextResponse(res.body as any, { status: res.status, headers: passHeaders })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
	return forward(req, params.path.join('/'))
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
	return forward(req, params.path.join('/'))
}
