import { Module } from "@nestjs/common";
import { ProductService } from "./service/product.service";
import { ProductController } from "./controller/product.controller";
import { ResponseModule } from "../response/response.module";
import { HelperModule } from "../helpers/helper.module";

@Module({
  imports: [ResponseModule, HelperModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
