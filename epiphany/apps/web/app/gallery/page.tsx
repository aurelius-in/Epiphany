'use client'

import { useEffect, useState } from 'react'

type Generation = {
	id: string
	kind: 'image' | 'video'
	status: string
	outputUrl?: string | null
	previewUrls?: string[] | null
	createdAt?: string
}

export default function GalleryPage() {
	const [items, setItems] = useState<Generation[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const run = async () => {
			setLoading(true)
			try {
				const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
				const res = await fetch(`${base}/v1/generations`, { headers: { 'X-API-Key': 'dev' } })
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const data = await res.json()
				setItems(data.items ?? [])
			} catch (e: any) {
				setError(e.message)
			} finally {
				setLoading(false)
			}
		}
		run()
	}, [])

	return (
		<div style={{padding: 16}}>
			<h1 style={{marginBottom: 12}}>Gallery</h1>
			{loading && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
				{items.map(it => (
					<a key={it.id} href={it.outputUrl ?? '#'} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#e6e6ea'}}>
						<div style={{border:'1px solid #26262a', borderRadius:8, overflow:'hidden', background:'#101012'}}>
							{it.kind === 'image' && it.outputUrl && (
								<img src={it.outputUrl} alt={it.id} style={{width:'100%', height:220, objectFit:'cover'}} />
							)}
							{it.kind === 'video' && it.outputUrl && (
								<video src={it.outputUrl} style={{width:'100%', height:220, objectFit:'cover'}} controls />
							)}
							<div style={{padding:8, fontSize:12, color:'#a4a4ad'}}>
								<div>{it.kind} • {it.status}</div>
							</div>
						</div>
					</a>
				))}
			</div>
		</div>
	)
}
