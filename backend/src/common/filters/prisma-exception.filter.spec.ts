import { ArgumentsHost, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

describe('PrismaExceptionFilter', () => {
  it.each(['P2021', 'P2022'])('reports missing schema (%s) as a service failure', (code) => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const host = { switchToHttp: () => ({ getResponse: () => response }) } as ArgumentsHost;
    const error = new Prisma.PrismaClientKnownRequestError('Internal schema details', {
      code,
      clientVersion: '6',
      meta: { table: 'public.User' }
    });

    new PrismaExceptionFilter().catch(error, host);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 503,
      message: 'The service is temporarily unavailable. Please contact your administrator.',
      error: 'Database Error'
    });
    expect(log).toHaveBeenCalledWith(expect.stringContaining(code));
    log.mockRestore();
  });
});
