export default function AboutPage() {
	return (
		<div style={{padding:16}}>
			<h1>About Epiphany</h1>
			<p style={{marginTop:8, color:'#a4a4ad'}}>
				Epiphany is a full‑stack AI art studio demo with image/video generation, editing, explainability, and storage built in.
			</p>
			<ul style={{marginTop:12}}>
				<li>Frontend: Next.js + Tailwind (static UI served from public)</li>
				<li>API: Express + Zod + BullMQ + Prisma</li>
				<li>Workers: FastAPI (image/video/edit/explain)</li>
				<li>Infra: Postgres, Redis, MinIO</li>
			</ul>
		</div>
	)
}


