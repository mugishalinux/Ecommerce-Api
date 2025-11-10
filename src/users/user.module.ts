import { Module } from "@nestjs/common";
import { UserService } from "./service/user.service";
import { UserController } from "./controller/user.controller";
import { ResponseModule } from "../response/response.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    ResponseModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRATION || '7d' },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
