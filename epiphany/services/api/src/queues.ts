import { Queue, QueueEvents, Worker } from 'bullmq'
import IORedis from 'ioredis'

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

export const queues = {
	generate_image: new Queue('generate_image', { connection }),
	generate_video: new Queue('generate_video', { connection }),
	edit_image: new Queue('edit_image', { connection }),
	explain: new Queue('explain', { connection }),
}

export function queueEvents() {
	return {
		generate_image: new QueueEvents('generate_image', { connection }),
		generate_video: new QueueEvents('generate_video', { connection }),
		edit_image: new QueueEvents('edit_image', { connection }),
		explain: new QueueEvents('explain', { connection }),
	}
}

// Workers will be added later to forward to Python services
export function startWorkers() {
	new Worker('noop', async () => {}, { connection })
}
