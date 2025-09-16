'use client'

import { useEffect, useState } from 'react'

type Health = { ok: boolean, services: Record<string, boolean> }

type Version = { name?: string, version?: string }

type Config = { webOrigin?: string|null, allowNswf?: boolean, rateLimit?: any, s3?: any }

export default function HealthPage() {
	const [data, setData] = useState<Health | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [version, setVersion] = useState<Version | null>(null)
	const [config, setConfig] = useState<Config | null>(null)

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch(`/api/proxy/v1/health`)
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				setData(await res.json())
				const v = await fetch(`/api/proxy/v1/version`)
				setVersion(await v.json())
				const c = await fetch(`/api/proxy/v1/config`)
				setConfig(await c.json())
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
					{version && (
						<div style={{marginTop:8}}>Version: <strong>{version.version || ''}</strong></div>
					)}
					{config && (
						<pre style={{marginTop:8, background:'#0b0b0d', padding:12, border:'1px solid #26262a', borderRadius:8}}>{JSON.stringify(config, null, 2)}</pre>
					)}
					<div style={{marginTop: 12}}>
						<a href="/api/proxy/v1/events" target="_blank" style={{color:'#cfd0ff'}}>Open Events JSON</a>
					</div>
				</div>
			)}
		</div>
	)
}
