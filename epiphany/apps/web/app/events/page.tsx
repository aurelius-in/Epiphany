'use client'

import { useEffect, useState } from 'react'

type EventItem = { id: string, generationId: string, type: string, payload: any, createdAt: string }
type ListRes = { items: EventItem[], nextPage?: number }

export default function EventsPage() {
	const [items, setItems] = useState<EventItem[]>([])
	const [page, setPage] = useState(1)
	const [nextPage, setNextPage] = useState<number | undefined>(undefined)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [genId, setGenId] = useState('')
	const [types, setTypes] = useState<string[]>([])
	const [type, setType] = useState<string>('')

	async function load(p = 1) {
		setLoading(true)
		try {
			const q = new URLSearchParams({ page: String(p), limit: '100' })
			if (genId) q.set('generationId', genId)
			if (type) q.set('type', type)
			const res = await fetch(`/api/proxy/v1/events?${q.toString()}`)
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
	useEffect(() => { (async () => { try { const r = await fetch('/api/proxy/v1/event-types'); const j = await r.json(); setTypes(j.types || []) } catch {} })() }, [])

	return (
		<div style={{padding:16}}>
			<h1 style={{marginBottom:12}}>Events</h1>
			<div style={{display:'flex', gap:8, alignItems:'center', marginBottom:12}}>
				<input placeholder="Filter by generationId" value={genId} onChange={e=>setGenId(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}} />
				<select value={type} onChange={e=>setType(e.target.value)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>
					<option value="">All types</option>
					{types.map(t => <option key={t} value={t}>{t}</option>)}
				</select>
				<button onClick={()=>load(1)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Apply</button>
			</div>
			{loading && page === 1 && <div>Loading…</div>}
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gap:8}}>
				{items.map(ev => (
					<div key={ev.id} style={{border:'1px solid #26262a', borderRadius:8, padding:8, background:'#101012'}}>
						<div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
							<div style={{fontWeight:600}}>{ev.type}</div>
							<div style={{fontSize:12, color:'#a4a4ad'}}>{new Date(ev.createdAt).toLocaleString()}</div>
						</div>
						<div style={{fontSize:12, color:'#c7c7d1'}}>gen: {ev.generationId}</div>
						<pre style={{whiteSpace:'pre-wrap', fontSize:12, color:'#a4a4ad', marginTop:6}}>{JSON.stringify(ev.payload, null, 2)}</pre>
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


