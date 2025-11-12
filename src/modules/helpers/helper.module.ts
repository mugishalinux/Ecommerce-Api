import { Module } from "@nestjs/common";
import { RedisHelper } from "./redis-helper";
import { KafkaHelper } from "./kafka.helper";
import { EventHelper } from "./events.helper";
import { FilterHelper } from "./filter.helper";

@Module({
  providers: [RedisHelper, KafkaHelper, EventHelper, FilterHelper],
  exports: [RedisHelper, KafkaHelper, EventHelper, FilterHelper],
})
export class HelperModule {}
