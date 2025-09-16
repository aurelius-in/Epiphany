'use client'

import { useEffect, useState } from 'react'

type Metrics = { totals: { generations: number, assets: number, events: number, explains: number }, generationsByStatus: { succeeded: number, failed: number, queued: number } }

export default function MetricsPage() {
	const [data, setData] = useState<Metrics | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch('/api/proxy/v1/metrics')
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
			<h1>Metrics</h1>
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			{!error && !data && <div>Loading…</div>}
			{data && (
				<div style={{display:'grid', gap:12}}>
					<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12}}>
						<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>Generations: <strong>{data.totals.generations}</strong></div>
						<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>Assets: <strong>{data.totals.assets}</strong></div>
						<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>Events: <strong>{data.totals.events}</strong></div>
						<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>Explains: <strong>{data.totals.explains}</strong></div>
					</div>
					<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>
						<h3>Generations by status</h3>
						<ul>
							<li>Succeeded: {data.generationsByStatus.succeeded}</li>
							<li>Failed: {data.generationsByStatus.failed}</li>
							<li>Queued: {data.generationsByStatus.queued}</li>
						</ul>
					</div>
				</div>
			)}
		</div>
	)
}


