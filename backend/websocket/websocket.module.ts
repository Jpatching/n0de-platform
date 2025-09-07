import { Module } from "@nestjs/common";
import { WebsocketGateway } from "./websocket.gateway";
import { AuthModule } from "../auth/auth.module";
import { MetricsModule } from "../metrics/metrics.module";

@Module({
  imports: [AuthModule, MetricsModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
