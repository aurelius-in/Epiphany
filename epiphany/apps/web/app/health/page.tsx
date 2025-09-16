'use client'

import { useEffect, useState } from 'react'

type Health = { ok: boolean, services: Record<string, boolean> }

export default function HealthPage() {
	const [data, setData] = useState<Health | null>(null)
	const [error, setError] = useState<string | null>(null)
	const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch(`${base}/v1/health`, { headers: { 'X-API-Key': 'dev' } })
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				setData(await res.json())
			} catch (e: any) {
				setError(e.message)
			}
		}
		run()
	}, [])

	return (
		<div style={{padding:16}}>
			<h1>Health</h1>
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			{!error && !data && <div>Loading…</div>}
			{data && (
				<div>
					<div style={{marginBottom:8}}>OK: {String(data.ok)}</div>
					<ul>
						{Object.entries(data.services || {}).map(([k,v]) => (
							<li key={k}>{k}: {String(v)}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
