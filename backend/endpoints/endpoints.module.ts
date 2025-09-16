import { Module } from "@nestjs/common";
import { EndpointsController } from "./endpoints.controller";

@Module({
  controllers: [EndpointsController],
})
export class EndpointsModule {}
