export function nowMs() {
  return Date.now();
}

export async function withLatency<T>(
  fn: () => Promise<T>,
  latencyMsOut: { value: number }
) {
  const start = nowMs();
  try {
    return await fn();
  } finally {
    latencyMsOut.value = nowMs() - start;
  }
}

export function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await work(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

