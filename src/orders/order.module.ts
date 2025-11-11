import { Module } from "@nestjs/common";
import { OrderService } from "./service/order.service";
import { OrderController } from "./controller/order.controller";
import { ResponseModule } from "../response/response.module";

@Module({
  imports: [ResponseModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
