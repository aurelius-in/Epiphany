import { Queue, QueueEvents, Worker, QueueOptions } from 'bullmq'
import IORedis from 'ioredis'

export const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379')

const queueOpts: QueueOptions = {
	connection,
	defaultJobOptions: {
		attempts: 2,
		backoff: { type: 'exponential', delay: 2000 },
		removeOnComplete: true,
		removeOnFail: false,
	},
}

export const queues = {
	generate_image: new Queue('generate_image', queueOpts),
	generate_video: new Queue('generate_video', queueOpts),
	edit_image: new Queue('edit_image', queueOpts),
	explain: new Queue('explain', queueOpts),
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
