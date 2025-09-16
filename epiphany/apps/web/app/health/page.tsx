'use client'

import { useEffect, useState } from 'react'

type Health = { ok: boolean, services: Record<string, boolean> }

type RateInfo = { limit?: string|null, remaining?: string|null, window?: string|null, reset?: string|null, requestId?: string|null }

export default function HealthPage() {
	const [data, setData] = useState<Health | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [version, setVersion] = useState<any>(null)
	const [config, setConfig] = useState<any>(null)
	const [rate, setRate] = useState<RateInfo>({})
	const [retention, setRetention] = useState<any>(null)

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch(`/api/proxy/v1/health`)
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				setData(await res.json())
				setRate({
					limit: res.headers.get('x-ratelimit-limit'),
					remaining: res.headers.get('x-ratelimit-remaining'),
					window: res.headers.get('x-ratelimit-window'),
					reset: res.headers.get('x-ratelimit-reset'),
					requestId: res.headers.get('x-request-id'),
				})
				const v = await fetch(`/api/proxy/v1/version`)
				setVersion(await v.json())
				const c = await fetch(`/api/proxy/v1/config`)
				setConfig(await c.json())
				const r = await fetch(`/api/proxy/v1/retention/config`)
				setRetention(await r.json())
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
					{retention && (
						<div style={{marginTop:8, display:'flex', alignItems:'center', gap:8}}>
							<div>Retention days: <strong>{retention.days ?? 'not set'}</strong></div>
							<button onClick={async()=>{ try{ const p = await fetch('/api/proxy/v1/retention/preview').then(r=>r.json()); alert(`Preview: assets=${p.assets}, generations=${p.generations}`)}catch(e:any){ alert('Failed: '+e.message) } }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Preview</button>
							<button onClick={async()=>{ try{ const r = await fetch('/api/proxy/v1/retention/run', { method:'POST' }); const j = await r.json(); alert(`Retention job ${j.id || ''} started`)}catch(e:any){ alert('Failed: '+e.message) } }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Run Retention</button>
						</div>
					)}
					{(rate.limit || rate.remaining) && (
						<div style={{marginTop:8, fontSize:12, color:'#a4a4ad'}}>
							Rate: limit={rate.limit} remaining={rate.remaining} windowMs={rate.window} resetMs={rate.reset} requestId={rate.requestId}
						</div>
					)}
					<div style={{marginTop: 12, display:'flex', gap:12, flexWrap:'wrap'}}>
						<a href="/api/proxy/v1/events" target="_blank" style={{color:'#cfd0ff'}}>Open Events JSON</a>
						<a href="/api/proxy/v1/events.csv" target="_blank" style={{color:'#cfd0ff'}}>Export Events CSV</a>
						<a href="/api/proxy/v1/assets/export/csv" target="_blank" style={{color:'#cfd0ff'}}>Export Assets CSV</a>
						<a href="/api/proxy/v1/stats/daily.csv" target="_blank" style={{color:'#cfd0ff'}}>Export Daily Stats CSV</a>
						<a href="/api/proxy/v1/metrics.csv" target="_blank" style={{color:'#cfd0ff'}}>Export Metrics CSV</a>
					</div>
				</div>
			)}
		</div>
	)
}
