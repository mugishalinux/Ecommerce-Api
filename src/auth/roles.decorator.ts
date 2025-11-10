import { SetMetadata, UseGuards, applyDecorators } from "@nestjs/common";
import { RoleEnum } from "../users/enums/role.enum";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiForbiddenResponse } from "@nestjs/swagger";

export const ROLES_KEY = "roles";

export const AuthGuarded = (...roles: RoleEnum[]) => {
  return applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: "Unauthorized - Invalid or missing token" }),
    ApiForbiddenResponse({ description: "Forbidden - Insufficient permissions" }),
  );
};
