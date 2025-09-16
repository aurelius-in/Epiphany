'use client'

import { useEffect, useState } from 'react'

type Asset = { id: string, url: string, kind: string, mime: string, bytes?: number|null, width?: number|null, height?: number|null }
type ListRes = { items: Asset[], nextPage?: number }

export default function AssetsPage() {
	const [items, setItems] = useState<Asset[]>([])
	const [page, setPage] = useState(1)
	const [nextPage, setNextPage] = useState<number | undefined>(undefined)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [kind, setKind] = useState<string>('')

	async function load(p = 1) {
		setLoading(true)
		try {
			const q = new URLSearchParams({ page: String(p), limit: '60', signed: '1' })
			if (kind) q.set('kind', kind)
			const res = await fetch(`/api/proxy/v1/assets/search?${q.toString()}`)
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
		<div style={{padding:16}}>
			<h1 style={{marginBottom:12}}>Assets</h1>
			<div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12}}>
				<select value={kind} onChange={e=>setKind(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>
					<option value="">All</option>
					<option value="image">Images</option>
					<option value="video">Videos</option>
				</select>
				<button onClick={()=>load(1)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Apply</button>
			</div>
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10}}>
				{items.map(a => (
					<div key={a.id} style={{border:'1px solid #26262a', borderRadius:8, overflow:'hidden', background:'#101012'}}>
						<div style={{position:'relative'}}>
							{a.kind === 'image' ? (
								<img src={a.url} alt={a.id} style={{width:'100%', height:180, objectFit:'cover'}} />
							) : (
								<video src={a.url} style={{width:'100%', height:180, objectFit:'cover'}} controls />
							)}
							<div style={{position:'absolute', bottom:6, right:6, background:'rgba(0,0,0,0.55)', padding:'4px 6px', borderRadius:6, fontSize:11, color:'#e6e6ea'}}>
								{a.width && a.height ? `${a.width}×${a.height}` : ''} {a.bytes ? `• ${(a.bytes/1024).toFixed(1)} KB` : ''}
							</div>
						</div>
						<div style={{padding:8, fontSize:12, color:'#a4a4ad', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
							<div>{a.kind} • {a.mime}</div>
							<div style={{display:'flex', gap:8}}>
								<a href={a.url} download style={{color:'#cfd0ff'}}>Download</a>
								<button onClick={async()=>{ try{ const r = await fetch(`/api/proxy/v1/assets/${a.id}/signed?ttl=900`); const j = await r.json(); if (j?.url) { await navigator.clipboard.writeText(j.url) } }catch{} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'6px 10px', borderRadius:8}}>Copy Signed</button>
								<button onClick={()=>{ try{ navigator.clipboard.writeText(a.url) }catch{} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'6px 10px', borderRadius:8}}>Copy URL</button>
								<button onClick={async (e)=>{e.preventDefault(); if (!confirm('Delete this asset?')) return; try{ await fetch('/api/proxy/v1/assets', { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: a.id }) }); await load(1); }catch{}}} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'6px 10px', borderRadius:8}}>Delete</button>
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


