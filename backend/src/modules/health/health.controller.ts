import type { Request, Response } from 'express'

/** GET /api/health — comprobación de estado para monitores y balanceadores. */
export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}
