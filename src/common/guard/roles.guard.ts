import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/common/enum/user-role.enum';
import { ROLES_KEY } from '@/common/decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();

    return requiredRoles.some((role) => {
      if (role === UserRole.STUDENT) return !!user?.student;
      if (role === UserRole.TEACHER) return !!user?.teacher;
      if (role === UserRole.ADMIN) return !!user?.admin;
      
      return false;
    });
  }
}
