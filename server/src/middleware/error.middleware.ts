import type { NextFunction, Request, Response } from 'express';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // eslint-disable-next-line no-console
  console.error('[avatarx-server] Unhandled error', err);

  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({
    ok: false,
    error: {
      message,
    },
  });
}

