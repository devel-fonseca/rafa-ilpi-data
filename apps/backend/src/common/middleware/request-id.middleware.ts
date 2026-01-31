import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { requestContext } from '../context/request-context'

/**
 * Middleware que garante que toda request tenha um requestId único
 * para rastreamento de logs e debugging.
 *
 * O requestId pode vir do header X-Request-ID (se fornecido pelo cliente)
 * ou será gerado automaticamente.
 *
 * Usa AsyncLocalStorage para propagar o requestId para toda a cadeia
 * de execução (incluindo queries do Prisma).
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extrair requestId do header ou gerar novo
    const requestId = (req.headers['x-request-id'] as string) || uuidv4()

    // Adicionar requestId no request para uso posterior
    ;(req as any).requestId = requestId

    // Adicionar requestId no header da resposta para rastreamento
    res.setHeader('X-Request-ID', requestId)

    // Executar toda a request dentro do contexto do AsyncLocalStorage
    requestContext.run({ requestId }, () => next())
  }
}
