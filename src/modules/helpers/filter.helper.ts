import { Injectable } from "@nestjs/common";
import { BaseEntity, FindOptionsWhere } from "typeorm";

@Injectable()
export class FilterHelper {
  async paginate<T extends BaseEntity>(
    entity: typeof BaseEntity & { new (): T },
    pageSize: number,
    pageNumber: number,
    where?: FindOptionsWhere<T>,
    relations?: string[],
  ) {
    const take = pageSize || 10;
    const skip = ((pageNumber || 1) - 1) * take;

    const [data, total] = await (entity as any).findAndCount({
      where,
      relations,
      take,
      skip,
      order: { created_at: "DESC" } as any,
    });

    const totalPages = Math.ceil(total / take);

    return {
      success: true,
      message: "Data retrieved successfully",
      object: data,
      pageNumber: pageNumber || 1,
      pageSize: take,
      totalSize: total,
      totalPages,
      errors: null,
    };
  }
}
