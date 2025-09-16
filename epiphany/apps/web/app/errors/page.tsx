'use client'

import { useEffect, useState } from 'react'

type Generation = { id: string, kind: 'image'|'video', status: string, error?: string|null, inputPrompt?: string|null }
type ListRes = { items: Generation[], nextPage?: number }

export default function ErrorsPage() {
	const [items, setItems] = useState<Generation[]>([])
	const [page, setPage] = useState(1)
	const [nextPage, setNextPage] = useState<number | undefined>(undefined)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function load(p = 1) {
		setLoading(true)
		try {
			const res = await fetch(`/api/proxy/v1/errors?page=${p}&limit=50`)
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
			<h1>Errors</h1>
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gap:8}}>
				{items.map(it => (
					<div key={it.id} style={{border:'1px solid #26262a', borderRadius:8, padding:8}}>
						<div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
							<div><strong>{it.kind}</strong> • {it.id}</div>
							<div style={{display:'flex', gap:8}}>
								<a href={`/generations/${it.id}`} style={{color:'#cfd0ff'}}>Details</a>
								<button onClick={async()=>{ try{ const r = await fetch(`/api/proxy/v1/retry/${it.id}`, { method:'POST' }); const j = await r.json(); if (j?.generationId) location.href = `/generations/${j.generationId}` }catch{} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'6px 10px', borderRadius:8}}>Retry</button>
							</div>
						</div>
						<div style={{fontSize:12, color:'#a4a4ad', marginTop:6}}>{it.inputPrompt || ''}</div>
						{it.error && <div style={{fontSize:12, color:'tomato', marginTop:6}}>Error: {it.error}</div>}
					</div>
				))}
			</div>
			{nextPage && (
				<div style={{marginTop:12}}>
					<button onClick={() => load(nextPage!)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'10px 14px', borderRadius:12}}>Load more</button>
				</div>
			)}
		</div>
	)
}


