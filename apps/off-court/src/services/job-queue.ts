const jobs = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleJob(jobId: string, fn: () => Promise<void>, delayMs: number): void {
  const handle = setTimeout(() => {
    jobs.delete(jobId);
    fn().catch((err: unknown) => {
      console.error('scheduled job failed', jobId, err);
    });
  }, delayMs);
  jobs.set(jobId, handle);
}

export function cancelJob(jobId: string): void {
  const handle = jobs.get(jobId);
  if (handle !== undefined) {
    clearTimeout(handle);
    jobs.delete(jobId);
  }
}
