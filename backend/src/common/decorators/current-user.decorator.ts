import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = {
  sub: string;
  companyId: string;
  activeCompanyId?: string;
  email: string;
  role: string;
  employeeCode?: string | null;
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user: RequestUser }>();
  const selectedCompanyId = request.headers['x-company-id'];
  if (request.user?.role === 'super_admin' && typeof selectedCompanyId === 'string' && selectedCompanyId.trim()) {
    return { ...request.user, activeCompanyId: selectedCompanyId };
  }
  return request.user;
});
