import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientInitializationError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError | Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.toHttpError(error);

    response.status(statusCode).json({
      statusCode,
      message,
      error: statusCode >= 500 ? 'Database Error' : undefined
    });
  }

  private toHttpError(error: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientInitializationError | Prisma.PrismaClientValidationError) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'Database connection is unavailable. Please check the backend database service.'
      };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'The request contains invalid database fields.'
      };
    }

    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : String(error.meta?.target || 'field');
      if (target.includes('slug')) return { statusCode: HttpStatus.CONFLICT, message: 'Organization code already exists.' };
      if (target.includes('email')) return { statusCode: HttpStatus.CONFLICT, message: 'Email already exists.' };
      return { statusCode: HttpStatus.CONFLICT, message: 'A record with this value already exists.' };
    }

    if (error.code === 'P2025') {
      return { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found.' };
    }

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'The database rejected this request.'
    };
  }
}
