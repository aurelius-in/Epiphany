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

type ListRes = { items: Generation[], nextPage?: number }

export default function GalleryPage() {
	const [items, setItems] = useState<Generation[]>([])
	const [page, setPage] = useState(1)
	const [nextPage, setNextPage] = useState<number | undefined>(undefined)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'

	async function load(p = 1) {
		setLoading(true)
		try {
			const res = await fetch(`${base}/v1/generations?page=${p}&limit=24`, { headers: { 'X-API-Key': 'dev' } })
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data: ListRes = await res.json()
			setItems(prev => p === 1 ? data.items : [...prev, ...data.items])
			setNextPage(data.nextPage)
			setPage(p)
		} catch (e: any) {
			setError(e.message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => { load(1) }, [])

	return (
		<div style={{padding: 16}}>
			<h1 style={{marginBottom: 12}}>Gallery</h1>
			{loading && page === 1 && <div>Loading…</div>}
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
			{nextPage && (
				<div style={{marginTop: 12}}>
					<button onClick={() => load(nextPage!)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'10px 14px', borderRadius:12}}>Load more</button>
				</div>
			)}
		</div>
	)
}
