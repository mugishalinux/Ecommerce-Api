import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Order } from "../entity/order.entity";
import { OrderItem } from "../entity/order.item.entity";
import { Product } from "../../products/entity/product.entity";
import { PlaceOrderDto } from "../dto/place-order.dto";
import { DataSource } from "typeorm";
import { OrderStatus } from "../enums/order.status.enum";
import { ResponseService } from "src/response/response.service";

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly response: ResponseService,
    private readonly dataSource: DataSource,
  ) {}

  async placeOrder(placeOrderDto: PlaceOrderDto, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderItems: OrderItem[] = [];
      let totalPrice = 0;

      for (const item of placeOrderDto.products) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          );
        }

        product.stock -= item.quantity;
        await queryRunner.manager.save(product);

        const itemPrice = Number(product.price) * item.quantity;
        totalPrice += itemPrice;

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.quantity = item.quantity;
        orderItem.price = Number(product.price);

        orderItems.push(orderItem);
      }

      const order = new Order();
      order.user = { id: userId } as any;
      order.totalPrice = Number(totalPrice.toFixed(2));
      order.status = OrderStatus.PENDING;
      order.description = `Order with ${orderItems.length} item(s)`;

      const savedOrder = await queryRunner.manager.save(order);

      for (const orderItem of orderItems) {
        orderItem.order = savedOrder;
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Order placed successfully with ID: ${savedOrder.id}`);

      const fullOrder = await Order.findOne({
        where: { id: savedOrder.id },
        relations: ['user', 'products', 'products.product'],
      });

      return this.response.fetchResponse({
        orderId: fullOrder?.id,
        status: fullOrder?.status,
        totalPrice: fullOrder?.totalPrice,
        products: fullOrder?.products.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
      });
    } catch (e) {
      await queryRunner.rollbackTransaction();
      this.logger.error("Failed to place order", e);
      
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException("Failed to place order: " + e.message);
    } finally {
      await queryRunner.release();
    }
  }

  async getMyOrders(userId: string) {
    try {
      const orders = await Order.find({
        where: { user: { id: userId } },
        relations: ['products', 'products.product'],
        order: { created_at: 'DESC' },
      });

      return this.response.fetchResponse(
        orders.map(order => ({
          orderId: order.id,
          status: order.status,
          totalPrice: order.totalPrice,
          createdAt: order.created_at,
          products: order.products.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }))
      );
    } catch (e) {
      this.logger.error("Failed to retrieve orders", e);
      throw new BadRequestException("Failed to retrieve orders: " + e.message);
    }
  }
}
