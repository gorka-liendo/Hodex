import { Writable } from 'node:stream'
import { describe, expect, it } from 'vitest'
import express from 'express'
import pino from 'pino'
import { pinoHttp } from 'pino-http'
import request from 'supertest'
import { LOG_REDACT } from './logger.js'

/**
 * Regresión: los logs de peticiones no deben contener credenciales. Monta el
 * mismo pino-http que la app, con la misma configuración de redacción.
 */
describe('logs de peticiones', () => {
  it('ocultan cookies, secreto del gateway y Authorization', async () => {
    let output = ''
    const sink = new Writable({
      write(chunk, _enc, done) {
        output += chunk.toString()
        done()
      },
    })

    const app = express()
    app.use(pinoHttp({ logger: pino({ redact: LOG_REDACT }, sink) }))
    app.get('/', (_req, res) => {
      res.cookie('hodex_session', 'TOKEN_RESPUESTA').send('ok')
    })

    await request(app)
      .get('/')
      .set('Cookie', 'hodex_session=TOKEN_PETICION')
      .set('x-hodex-gateway', 'SECRETO_GATEWAY')
      .set('Authorization', 'Bearer SECRETO_BEARER')

    expect(output).toContain('[Redacted]')
    for (const secret of ['TOKEN_PETICION', 'TOKEN_RESPUESTA', 'SECRETO_GATEWAY', 'SECRETO_BEARER']) {
      expect(output).not.toContain(secret)
    }
  })
})
