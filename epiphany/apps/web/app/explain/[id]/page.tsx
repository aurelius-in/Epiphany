'use client'

import { useEffect, useState } from 'react'

type TokenScore = { token: string, score: number }

type Explain = { id: string, tokenScores: TokenScore[], heatmapUrls: string[] }

export default function ExplainPage({ params }: { params: { id: string } }) {
	const [data, setData] = useState<Explain | null>(null)
	const [error, setError] = useState<string | null>(null)
	const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch(`${base}/v1/explain/${params.id}`, { headers: { 'X-API-Key': 'dev' } })
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const j = await res.json()
				setData(j)
			} catch (e: any) {
				setError(e.message)
			}
		}
		run()
	}, [params.id])

	if (error) return <div style={{padding:16}}>Error: {error}</div>
	if (!data) return <div style={{padding:16}}>Loading…</div>

	return (
		<div style={{padding:16, display:'grid', gap:16}}>
			<h1>Explain {data.id}</h1>
			<div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
				{data.heatmapUrls?.map((u, i) => (
					<img key={i} src={u} alt={`heatmap-${i}`} style={{width:240, height:240, objectFit:'cover', border:'1px solid #26262a', borderRadius:8}} />
				))}
			</div>
			<div>
				<h3>Token scores</h3>
				<div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:8, maxWidth:420}}>
					{data.tokenScores?.map((t, i) => (
						<>
							<div key={`tok-${i}`} style={{color:'#a4a4ad'}}>{t.token}</div>
							<div key={`bar-${i}`} style={{background:'#101012', border:'1px solid #26262a', borderRadius:8}}>
								<div style={{width: `${Math.round(Math.max(0, Math.min(1, t.score))*100)}%`, height: 16, background: 'linear-gradient(90deg,#FF007A,#7A00FF,#FF6A00)'}} />
							</div>
						</>
					))}
				</div>
			</div>
		</div>
	)
}
