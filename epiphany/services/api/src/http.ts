export async function postJson<T>(url: string, body: any, opts?: { headers?: Record<string,string>, timeoutMs?: number }) : Promise<T> {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 600000)
	try {
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
			body: JSON.stringify(body),
			signal: controller.signal,
		})
		if (!res.ok) {
			const txt = await res.text().catch(() => '')
			throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`)
		}
		return (await res.json()) as T
	} finally {
		clearTimeout(id)
	}
}

export async function getJson<T>(url: string, opts?: { headers?: Record<string,string>, timeoutMs?: number }) : Promise<T> {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 600000)
	try {
		const res = await fetch(url, {
			method: 'GET',
			headers: { ...(opts?.headers || {}) },
			signal: controller.signal,
		})
		if (!res.ok) {
			const txt = await res.text().catch(() => '')
			throw new Error(`HTTP ${res.status} ${res.statusText} ${txt}`)
		}
		return (await res.json()) as T
	} finally {
		clearTimeout(id)
	}
}
