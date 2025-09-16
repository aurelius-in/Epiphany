'use client'

import { useEffect, useState } from 'react'

type Generation = {
	id: string
	kind: 'image' | 'video'
	status: string
	outputUrl?: string | null
	previewUrls?: string[] | null
	inputPrompt?: string | null
	modelId?: string | null
	steps?: number | null
	cfg?: number | null
	seed?: number | null
	safety?: any | null
}

type EventsRes = { items: Array<{ id: string, type: string, payload: any, createdAt: string }>, nextPage?: number }

export default function GenerationDetail({ params }: { params: { id: string } }) {
	const [gen, setGen] = useState<Generation | null>(null)
	const [events, setEvents] = useState<EventsRes | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [progress, setProgress] = useState<number | null>(null)
	const [showExplain, setShowExplain] = useState(false)
	const [explain, setExplain] = useState<{ heatmapUrls?: string[], tokenScores?: any[] } | null>(null)
	const [blur, setBlur] = useState(false)
	const id = params.id

	useEffect(() => {
		const run = async () => {
			try {
				const g = await fetch(`/api/proxy/v1/generations/${id}?signed=1&ttl=900`).then(r => r.json())
				setGen(g)
				try { const ex = await fetch(`/api/proxy/v1/explain/${id}`).then(r=>r.ok?r.json():null); setExplain(ex) } catch {}
				const ev = await fetch(`/api/proxy/v1/generations/${id}/events?limit=50`).then(r => r.json())
				setEvents(ev)
				try {
					const jb = await fetch(`/api/proxy/v1/jobs/by-generation/${id}`).then(r=>r.ok?r.json():null)
					if (jb?.id) {
						const es = new EventSource(`/api/proxy/v1/jobs/${jb.id}/stream`)
						es.onmessage = (e) => { try { const ev = JSON.parse(e.data); if (typeof ev.progress === 'number') setProgress(ev.progress) } catch {} }
						es.onerror = () => { try { es.close() } catch {} }
					}
				} catch {}
			} catch (e: any) {
				setError(e.message)
			}
		}
		run()
	}, [id])

	async function onCancel() {
		try { await fetch(`/api/proxy/v1/jobs/by-generation/${id}/cancel`, { method: 'POST' }); location.reload() } catch {}
	}

	async function onDelete() {
		try {
			await fetch(`/api/proxy/v1/generations/${id}`, { method: 'DELETE' })
			location.href = '/gallery'
		} catch {}
	}

	if (error) return <div style={{padding:16}}>Error: {error}</div>
	if (!gen) return <div style={{padding:16}}>Loading…</div>

	return (
		<div style={{padding:16, display:'grid', gap:16}}>
			<div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
				<h1>Generation {gen.id} <button onClick={()=>{ try{ navigator.clipboard.writeText(gen.id || '') }catch{} }} style={{marginLeft:8, fontSize:12}}>Copy ID</button></h1>
				<div style={{display:'flex', gap:8}}>
					{progress != null && <span style={{border:'1px solid #26262a', padding:'6px 10px', borderRadius:8}}>Progress: {progress}%</span>}
					<button onClick={async()=>{ try{ await fetch(`/api/proxy/v1/explain/${id}/refresh`, { method:'POST' }); location.reload() }catch{} }} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Refresh Explain</button>
					<button onClick={()=>setShowExplain(v=>!v)} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>{showExplain ? 'Hide' : 'Show'} Explain</button>
					<button onClick={onCancel} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Cancel</button>
					<button onClick={onDelete} style={{background:'#0b0b0d', color:'#ddd', border:'1px solid #26262a', padding:'8px 12px', borderRadius:8}}>Delete</button>
				</div>
			</div>
			<div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
				<div style={{border:'1px solid #26262a', borderRadius:8, padding:8, background:'#101012'}}>
					{gen.kind === 'image' && gen.outputUrl && (
						<div style={{position:'relative'}}>
							<img src={gen.outputUrl} alt={gen.id} style={{width:'100%', height:'auto', filter: blur ? 'blur(10px)' : 'none'}} />
							{showExplain && explain?.heatmapUrls && explain.heatmapUrls[0] && (
								<img src={explain.heatmapUrls[0]} alt="heatmap" style={{position:'absolute', inset:8, width:'calc(100% - 16px)', height:'auto', mixBlendMode:'screen', opacity:0.5, pointerEvents:'none'}} />
							)}
						</div>
					)}
					{gen.kind === 'video' && gen.outputUrl && <video src={gen.outputUrl} controls style={{width:'100%', height:'auto'}} />}
					{Array.isArray(gen.previewUrls) && gen.previewUrls.length > 0 && (
						<div style={{display:'flex', gap:6, marginTop:8}}>
							{gen.previewUrls.map((p, i) => <img key={i} src={p} style={{width:64, height:64, objectFit:'cover', border:'1px solid #26262a', borderRadius:6}} />)}
						</div>
					)}
				</div>
				<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>
					<h3>Details</h3>
					<ul>
						<li>Status: {gen.status}</li>
						<li>Prompt: {gen.inputPrompt} <button onClick={()=>{ try{ navigator.clipboard.writeText(gen.inputPrompt || '') }catch{} }} style={{marginLeft:8, fontSize:12}}>Copy</button></li>
						<li>Model: {gen.modelId}</li>
						<li>Steps/CFG: {gen.steps ?? '-'} / {gen.cfg ?? '-'}</li>
						<li>Seed: {gen.seed ?? '-'}</li>
					</ul>
					<div style={{display:'flex', gap:8, alignItems:'center'}}>
						<label style={{display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'#a4a4ad'}}>
							<input type="checkbox" checked={blur} onChange={e=>setBlur(e.target.checked)} /> Blur output
						</label>
					</div>
					{gen.outputUrl && <div style={{marginTop:8, fontSize:12}}>Output URL: <a href={gen.outputUrl} target="_blank" style={{color:'#cfd0ff'}}>{gen.outputUrl}</a> <button onClick={()=>{ try{ navigator.clipboard.writeText(gen.outputUrl || '') }catch{} }} style={{marginLeft:8, fontSize:12}}>Copy</button></div>}
				</div>
			</div>
			<div style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>
				<h3>Events</h3>
				{!events && <div>Loading…</div>}
				{events && (
					<div style={{display:'grid', gap:8}}>
						{events.items.map(e => (
							<div key={e.id} style={{border:'1px solid #26262a', borderRadius:8, padding:8}}>
								<div style={{display:'flex', justifyContent:'space-between'}}>
									<div>{e.type}</div>
									<div style={{fontSize:12, color:'#a4a4ad'}}>{new Date(e.createdAt).toLocaleString()}</div>
								</div>
								<pre style={{whiteSpace:'pre-wrap', fontSize:12, color:'#a4a4ad'}}>{JSON.stringify(e.payload, null, 2)}</pre>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}


