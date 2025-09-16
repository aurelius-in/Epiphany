'use client'

import { useEffect, useState } from 'react'

type Generation = {
	id: string
	kind: 'image' | 'video'
	status: string
	outputUrl?: string | null
	previewUrls?: string[] | null
	createdAt?: string
	inputPrompt?: string
	aspect?: string | null
	steps?: number | null
	cfg?: number | null
	seed?: number | null
	modelId?: string | null
	stylePreset?: string | null
	safety?: any | null
}

type ListRes = { items: Generation[], nextPage?: number }

export default function GalleryPage() {
	const [items, setItems] = useState<Generation[]>([])
	const [page, setPage] = useState(1)
	const [nextPage, setNextPage] = useState<number | undefined>(undefined)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function load(p = 1) {
		setLoading(true)
		try {
			const res = await fetch(`/api/proxy/v1/generations?page=${p}&limit=24&signed=1`)
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

	function recreateHref(g: Generation) {
		const q = new URLSearchParams()
		if (g.inputPrompt) q.set('prompt', g.inputPrompt)
		if (g.aspect) q.set('aspect', g.aspect)
		if (g.steps != null) q.set('steps', String(g.steps))
		if (g.cfg != null) q.set('cfg', String(g.cfg))
		if (g.seed != null) q.set('seed', String(g.seed))
		if (g.modelId) q.set('model', g.modelId)
		if (g.stylePreset) q.set('style', g.stylePreset)
		return `/?${q.toString()}`
	}

	function safetyLabel(s: any | null | undefined) {
		if (!s) return null
		const nsfw = typeof s.nsfw === 'number' ? s.nsfw : 0
		if (nsfw >= 0.8) return 'NSFW high'
		if (nsfw >= 0.3) return 'NSFW med'
		return 'Safe'
	}

	return (
		<div style={{padding: 16}}>
			<h1 style={{marginBottom: 12}}>Gallery</h1>
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
				{items.map(it => (
					<div key={it.id} style={{border:'1px solid #26262a', borderRadius:8, overflow:'hidden', background:'#101012'}}>
						<a href={it.outputUrl ?? '#'} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#e6e6ea'}}>
							{it.kind === 'image' && it.outputUrl && (
								<img src={it.outputUrl} alt={it.id} style={{width:'100%', height:220, objectFit:'cover'}} />
							)}
							{it.kind === 'video' && it.outputUrl && (
								<div style={{position:'relative'}}>
									<video src={it.outputUrl} style={{width:'100%', height:220, objectFit:'cover'}} muted />
									<div style={{position:'absolute', inset:0, display:'grid', placeItems:'center'}}>
										<div style={{width:44, height:44, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'1px solid #fff3', display:'grid', placeItems:'center'}}>
											<div style={{marginLeft:3, width:0, height:0, borderTop:'8px solid transparent', borderBottom:'8px solid transparent', borderLeft:'14px solid #fff'}} />
										</div>
									</div>
								</div>
							)}
						</a>
						<div style={{padding:8, fontSize:12, color:'#a4a4ad', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
							<div>{it.kind} • {it.status}</div>
							<div style={{display:'flex', gap:6, alignItems:'center'}}>
								{it.safety && <span style={{border:'1px solid #26262a', padding:'2px 6px', borderRadius:8}}>{safetyLabel(it.safety)}</span>}
								<a href={recreateHref(it)} style={{color:'#cfd0ff'}}>Recreate</a>
							</div>
						</div>
					</div>
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
