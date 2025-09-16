import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  @ApiResponse({
    status: 200,
    description: "User profile retrieved successfully",
  })
  async getCurrentUser(@Request() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Put("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  async updateCurrentUser(@Request() req, @Body() updateData: any) {
    return this.usersService.update(req.user.userId, updateData);
  }

  @Get("usage/summary")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user usage summary" })
  @ApiResponse({
    status: 200,
    description: "Usage summary retrieved successfully",
    schema: {
      type: "object",
      properties: {
        totalRequests: { type: "number" },
        dailyAverage: { type: "number" },
        monthlyTotal: { type: "number" },
        remainingQuota: { type: "number" },
      },
    },
  })
  async getUsageSummary(@Request() req) {
    return this.usersService.getUsageSummary(req.user.userId);
  }

  @Get("payment-methods")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user payment methods" })
  @ApiResponse({
    status: 200,
    description: "User payment methods retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          last4: { type: "string" },
          brand: { type: "string" },
          expiryMonth: { type: "number" },
          expiryYear: { type: "number" },
          isDefault: { type: "boolean" },
        },
      },
    },
  })
  async getPaymentMethods(@Request() req) {
    return this.usersService.getPaymentMethods(req.user.userId);
  }

  @Get("billing-address")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user billing address" })
  @ApiResponse({
    status: 200,
    description: "Billing address retrieved successfully",
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        line1: { type: "string" },
        line2: { type: "string" },
        city: { type: "string" },
        state: { type: "string" },
        postalCode: { type: "string" },
        country: { type: "string" },
      },
    },
  })
  async getBillingAddress(@Request() req) {
    return this.usersService.getBillingAddress(req.user.userId);
  }

  @Put("billing-address")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user billing address" })
  async updateBillingAddress(@Request() req, @Body() addressData: any) {
    return this.usersService.updateBillingAddress(req.user.userId, addressData);
  }

  @Get("team")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user team members (Enterprise only)" })
  @ApiResponse({
    status: 200,
    description: "Team members retrieved successfully",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: {
            type: "string",
            enum: ["owner", "admin", "developer", "viewer"],
          },
          avatar: { type: "string" },
          lastActive: { type: "string" },
          status: { type: "string", enum: ["active", "pending", "inactive"] },
        },
      },
    },
  })
  async getTeamMembers(@Request() req) {
    return this.usersService.getTeamMembers(req.user.userId);
  }
}
