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

	async function load(p = 1) {
		setLoading(true)
		try {
			const res = await fetch(`/api/proxy/v1/assets?page=${p}&limit=60&signed=1`)
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
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:10}}>
				{items.map(a => (
					<div key={a.id} style={{border:'1px solid #26262a', borderRadius:8, overflow:'hidden', background:'#101012'}}>
						{a.kind === 'image' ? (
							<img src={a.url} alt={a.id} style={{width:'100%', height:180, objectFit:'cover'}} />
						) : (
							<video src={a.url} style={{width:'100%', height:180, objectFit:'cover'}} controls />
						)}
						<div style={{padding:8, fontSize:12, color:'#a4a4ad'}}>{a.kind} • {a.mime}</div>
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


