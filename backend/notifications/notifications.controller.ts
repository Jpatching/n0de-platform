import {
  Controller,
  Get,
  Post,
  Param,
  Request,
  UseGuards,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user notifications" })
  @ApiQuery({
    name: "unreadOnly",
    required: false,
    type: Boolean,
    description: "Get only unread notifications",
  })
  @ApiResponse({
    status: 200,
    description: "Notifications retrieved successfully",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getNotifications(
    @Request() req,
    @Query("unreadOnly", new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.userId,
      unreadOnly,
    );
  }

  @Post(":id/read")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async markAsRead(@Param("id") notificationId: string, @Request() req) {
    return this.notificationsService.markAsRead(
      notificationId,
      req.user.userId,
    );
  }

  @Post("read-all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }
}
