'use client'

import { useEffect, useState } from 'react'

type QueueCounts = { waiting?: number, active?: number, completed?: number, failed?: number, delayed?: number, paused?: number }
type QueueInfo = { name: string, counts?: QueueCounts, error?: string }

export default function QueuesPage() {
	const [queues, setQueues] = useState<QueueInfo[]>([])
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const run = async () => {
			try {
				const res = await fetch('/api/proxy/v1/queues')
				if (!res.ok) throw new Error(`HTTP ${res.status}`)
				const j = await res.json()
				setQueues(j.queues || [])
			} catch (e: any) {
				setError(e.message)
			}
		}
		run()
	}, [])

	return (
		<div style={{padding:16}}>
			<h1>Queues</h1>
			{error && <div style={{color:'tomato'}}>Error: {error}</div>}
			<div style={{display:'grid', gap:12}}>
				{queues.map(q => (
					<div key={q.name} style={{border:'1px solid #26262a', borderRadius:8, padding:12}}>
						<div style={{fontWeight:600}}>{q.name}</div>
						{q.error && <div style={{color:'tomato'}}>{q.error}</div>}
						{q.counts && (
							<ul style={{display:'flex', gap:12, flexWrap:'wrap'}}>
								<li>waiting: {q.counts.waiting ?? 0}</li>
								<li>active: {q.counts.active ?? 0}</li>
								<li>completed: {q.counts.completed ?? 0}</li>
								<li>failed: {q.counts.failed ?? 0}</li>
								<li>delayed: {q.counts.delayed ?? 0}</li>
								<li>paused: {q.counts.paused ?? 0}</li>
							</ul>
						)}
					</div>
				))}
			</div>
		</div>
	)
}


