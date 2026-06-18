// Windows + embedded Postgres intermittently fails to fork a connection child
// ("could not reserve shared memory region ... error code 487") due to ASLR/AV
// address collisions. The postmaster stays healthy; only the per-connection fork
// fails, surfacing as ECONNRESET. Retrying establishes a fresh fork that usually
// succeeds, so every DB entry point wraps its work in this helper.

export function isTransientDbError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | undefined;
  const code = e?.code ?? '';
  const msg = String(e?.message ?? '');
  return (
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === '57P03' || // cannot_connect_now (server starting)
    code === '08006' || // connection_failure
    code === '08003' || // connection_does_not_exist
    code === '08001' || // sqlclient_unable_to_establish_sqlconnection
    msg.includes('ECONNRESET') ||
    msg.includes('Connection terminated') ||
    msg.includes('terminating connection')
  );
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { attempts = 12, baseMs = 250 }: { attempts?: number; baseMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientDbError(err)) throw err;
      await new Promise((r) => setTimeout(r, baseMs * (i + 1)));
    }
  }
  throw lastErr;
}
