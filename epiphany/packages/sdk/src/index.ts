import { z } from 'zod'

const headers = (apiKey: string) => ({
  'Content-Type': 'application/json',
  'X-API-Key': apiKey,
})

export const enhanceReq = z.object({ prompt: z.string().min(1).max(2000) })
export const enhanceRes = z.object({ promptEnhanced: z.string(), seedPhrases: z.array(z.string()) })

export const jobRes = z.object({
  id: z.string(),
  status: z.string(),
  progress: z.number().optional(),
  outputUrl: z.string().url().optional(),
  previewUrls: z.array(z.string()).optional(),
  explainId: z.string().optional(),
  error: z.string().optional(),
})

export async function enhance(baseUrl: string, apiKey: string, prompt: string) {
  const body = enhanceReq.parse({ prompt })
  const r = await fetch(`${baseUrl}/v1/enhance`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body) })
  const j = await r.json()
  return enhanceRes.parse(j)
}

export async function getJob(baseUrl: string, apiKey: string, id: string) {
  const r = await fetch(`${baseUrl}/v1/jobs/${id}`, { headers: headers(apiKey) })
  const j = await r.json()
  return jobRes.parse(j)
}
