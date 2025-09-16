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
	const text = await res.text()
	return new NextResponse(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
	return forward(req, params.path.join('/'))
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
	return forward(req, params.path.join('/'))
}
