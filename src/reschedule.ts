import { TodoistApi } from '@doist/todoist-api-typescript'
import * as dotenv from 'dotenv'
import invariant from 'tiny-invariant'
/*updated to postpone recurring tasks with gemini*/
dotenv.config()

invariant(process.env.TODOIST_API_TOKEN, 'TODOIST_API_TOKEN must be set')

const api = new TodoistApi(process.env.TODOIST_API_TOKEN)

/**
 * Gets today's date in YYYY-MM-DD format, which is required by the Todoist API
 * for setting a specific date without time.
 */
function getTodayDateString(): string {
	const today = new Date()
	return today.toISOString().split('T')[0]
}

async function run() {
	console.info('Rescheduler started.')

	try {
		const tasks = await api.getTasks({
			filter: 'overdue',
		})

		if (!tasks.length) {
			console.info('No overdue tasks found.')
			return
		}

		console.info(`Found ${tasks.length} overdue tasks.`)

		const promises = []
		const todayString = getTodayDateString() // Get today's date once

		for (const task of tasks) {
			try {
				// --- MODIFIED LOGIC ---

				if (task.due?.isRecurring) {
					// SCENARIO A: POSTPONE THE RECURRING TASK (Safer & Recommended)
					// This moves the current overdue instance to today without breaking the
					// overall recurrence rule (e.g., "every Monday").
					promises.push(
						api.updateTask(task.id, { date: todayString }),
					)
					console.info(`Postponed recurring task ${task.id} to today.`)

					// ---
					
					// SCENARIO B: CHANGE THE ENTIRE RECURRENCE RULE (Destructive!)
					// Use this with caution. This will overwrite the original rule.
					// For example, "every Monday" would become "every day starting today".
					/* 
                    promises.push(
                        api.updateTask(task.id, { dueString: 'every day starting today' })
                    )
                    console.info(`Changed recurrence for task ${task.id} to start today.`);
                    */
				} else {
					// This is for non-recurring tasks, as in the original script.
					promises.push(
						api.updateTask(task.id, { dueString: 'Today' }),
					)
					console.info(`Rescheduled task ${task.id} to today.`)
				}
			} catch {
				console.error(`Failed to update task ${task.id}`)
			}
		}

		// Wait for all the update operations to complete
		await Promise.all(promises)
		console.info('All tasks updated successfully.')
	} catch (error) {
		if (error instanceof Error) {
			console.error(error.message)
		}
	}
}

run().catch((error) => {
	console.error(error)
})
