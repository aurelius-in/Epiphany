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
	const [q, setQ] = useState('')
	const [models, setModels] = useState<string[]>([])
	const [styles, setStyles] = useState<string[]>([])
	const [modelId, setModelId] = useState('')
	const [stylePreset, setStylePreset] = useState('')

	async function load(p = 1) {
		setLoading(true)
		try {
			let url = ''
			if (q) {
				url = `/api/proxy/v1/generations/search?q=${encodeURIComponent(q)}&page=${p}&limit=24`
			} else if (modelId || stylePreset) {
				const params = new URLSearchParams({ page: String(p), limit: '24' })
				if (modelId) params.set('modelId', modelId)
				if (stylePreset) params.set('stylePreset', stylePreset)
				url = `/api/proxy/v1/generations/filter?${params.toString()}`
			} else {
				url = `/api/proxy/v1/generations?page=${p}&limit=24&signed=1&ttl=900`
			}
			const res = await fetch(url)
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
	useEffect(() => { (async () => { try { const r = await fetch('/api/proxy/v1/tags'); const j = await r.json(); setModels(j.models || []); setStyles(j.styles || []) } catch {} })() }, [])

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
			<div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12, flexWrap:'wrap'}}>
				<input placeholder="Search prompt…" value={q} onChange={e=>setQ(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8, width:'280px'}} />
				<button onClick={()=>load(1)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Search</button>
				<select value={modelId} onChange={e=>setModelId(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>
					<option value="">All models</option>
					{models.map(m => <option key={m} value={m}>{m}</option>)}
				</select>
				<select value={stylePreset} onChange={e=>setStylePreset(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>
					<option value="">All styles</option>
					{styles.map(s => <option key={s} value={s}>{s}</option>)}
				</select>
				<button onClick={()=>{ setQ(''); load(1) }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Apply Filters</button>
			</div>
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
				{items.map(it => (
					<div key={it.id} style={{border:'1px solid #26262a', borderRadius:8, overflow:'hidden', background:'#101012'}}>
						<a href={it.outputUrl ?? '#'} target="_blank" rel="noreferrer" style={{textDecoration:'none', color:'#e6e6ea'}}>
							{it.kind === 'image' && it.outputUrl && (
								<div style={{position:'relative'}}>
									<img src={it.outputUrl} alt={it.id} style={{width:'100%', height:220, objectFit:'cover', filter: (it.safety && typeof (it.safety as any).nsfw === 'number' && (it.safety as any).nsfw > 0) ? 'blur(10px)' : 'none'}} />
									{(it.safety && typeof (it.safety as any).nsfw === 'number' && (it.safety as any).nsfw > 0) && (
										<div style={{position:'absolute', inset:0, display:'grid', placeItems:'center', color:'#e6e6ea', fontWeight:600}}>NSFW blurred</div>
									)}
								</div>
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
								<a href={`/generations/${it.id}`} style={{color:'#cfd0ff'}}>Details</a>
								<button onClick={async (e)=>{ e.preventDefault(); try { await fetch(`/api/proxy/v1/jobs/by-generation/${it.id}/cancel`, { method:'POST' }); } catch {} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'4px 8px', borderRadius:8}}>Cancel</button>
								<button onClick={async (e)=>{ e.preventDefault(); try { const r = await fetch(`/api/proxy/v1/retry/${it.id}`, { method:'POST' }); const j = await r.json(); if (j?.generationId) location.href = `/generations/${j.generationId}` } catch {} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'4px 8px', borderRadius:8}}>Retry</button>
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
