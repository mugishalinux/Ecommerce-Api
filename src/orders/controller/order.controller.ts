import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from '../service/order.service';
import { PlaceOrderDto } from '../dto/place-order.dto';
import { AuthGuarded } from 'src/auth/roles.decorator';
import { RoleEnum } from 'src/users/enums/role.enum';

@ApiTags('Orders')
@Controller({ version: '1', path: '/orders' })
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @AuthGuarded(RoleEnum.USER, RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Place a new order' })
  @ApiResponse({ status: 201, description: 'Order placed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - insufficient stock or invalid product' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  async placeOrder(@Body() placeOrderDto: PlaceOrderDto, @Request() req) {
    return this.orderService.placeOrder(placeOrderDto, req.user.id);
  }

  @Get()
  @AuthGuarded(RoleEnum.USER, RoleEnum.ADMIN, RoleEnum.SELLER)
  @ApiOperation({ summary: 'Get my order history' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - authentication required' })
  async getMyOrders(@Request() req) {
    return this.orderService.getMyOrders(req.user.id);
  }
}
