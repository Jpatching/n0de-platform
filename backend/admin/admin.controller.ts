import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import { AdminService } from "./admin.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  UserRole,
  SubscriptionType,
  SupportTicketStatus,
  PaymentStatus,
} from "@prisma/client";

@ApiTags("admin")
@Controller("admin")
@UseGuards(ThrottlerGuard, JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Get admin dashboard statistics" })
  @ApiResponse({
    status: 200,
    description: "Dashboard statistics retrieved successfully",
  })
  async getDashboardStats(@Request() req) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getDashboardStats();
  }

  // User Management
  @Get("users")
  @ApiOperation({ summary: "Get all users with pagination and filters" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search term",
  })
  @ApiQuery({
    name: "role",
    required: false,
    enum: UserRole,
    description: "Filter by user role",
  })
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  async getAllUsers(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("search") search?: string,
    @Query("role") role?: UserRole,
  ) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getAllUsers(page, limit, search, role);
  }

  @Get("users/:id")
  @ApiOperation({ summary: "Get user details by ID" })
  @ApiResponse({
    status: 200,
    description: "User details retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserDetails(@Request() req, @Param("id") userId: string) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getUserDetails(userId);
  }

  @Put("users/:id/role")
  @ApiOperation({ summary: "Update user role (Super Admin only)" })
  @ApiResponse({ status: 200, description: "User role updated successfully" })
  @ApiResponse({ status: 403, description: "Super admin privileges required" })
  async updateUserRole(
    @Request() req,
    @Param("id") userId: string,
    @Body("role", new ParseEnumPipe(UserRole)) role: UserRole,
  ) {
    return this.adminService.updateUserRole(req.user.userId, userId, role);
  }

  @Post("users/:id/suspend")
  @ApiOperation({ summary: "Suspend user account" })
  @ApiResponse({ status: 200, description: "User suspended successfully" })
  async suspendUser(
    @Request() req,
    @Param("id") userId: string,
    @Body("reason") reason: string,
  ) {
    return this.adminService.suspendUser(req.user.userId, userId, reason);
  }

  @Post("users/:id/unsuspend")
  @ApiOperation({ summary: "Unsuspend user account" })
  @ApiResponse({ status: 200, description: "User unsuspended successfully" })
  async unsuspendUser(@Request() req, @Param("id") userId: string) {
    return this.adminService.unsuspendUser(req.user.userId, userId);
  }

  @Put("users/:id/subscription")
  @ApiOperation({ summary: "Update user subscription manually" })
  @ApiResponse({
    status: 200,
    description: "Subscription updated successfully",
  })
  async updateUserSubscription(
    @Request() req,
    @Param("id") userId: string,
    @Body("planType", new ParseEnumPipe(SubscriptionType))
    planType: SubscriptionType,
  ) {
    return this.adminService.updateUserSubscription(
      req.user.userId,
      userId,
      planType,
    );
  }

  // Payment Management
  @Get("payments")
  @ApiOperation({ summary: "Get all payments with pagination and filters" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: PaymentStatus,
    description: "Filter by payment status",
  })
  @ApiQuery({
    name: "provider",
    required: false,
    type: String,
    description: "Filter by payment provider",
  })
  @ApiResponse({ status: 200, description: "Payments retrieved successfully" })
  async getAllPayments(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: PaymentStatus,
    @Query("provider") provider?: string,
  ) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getAllPayments(page, limit, status, provider);
  }

  @Get("payments/analytics")
  @ApiOperation({ summary: "Get payment analytics" })
  @ApiQuery({
    name: "days",
    required: false,
    type: Number,
    description: "Number of days to analyze (default: 30)",
  })
  @ApiResponse({
    status: 200,
    description: "Payment analytics retrieved successfully",
  })
  async getPaymentAnalytics(
    @Request() req,
    @Query("days", new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getPaymentAnalytics(days);
  }

  // Support Ticket Management
  @Get("support/tickets")
  @ApiOperation({
    summary: "Get all support tickets with pagination and filters",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: SupportTicketStatus,
    description: "Filter by ticket status",
  })
  @ApiResponse({
    status: 200,
    description: "Support tickets retrieved successfully",
  })
  async getAllSupportTickets(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: SupportTicketStatus,
  ) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getAllSupportTickets(page, limit, status);
  }

  @Put("support/tickets/:id")
  @ApiOperation({ summary: "Update support ticket status" })
  @ApiResponse({
    status: 200,
    description: "Ticket status updated successfully",
  })
  async updateTicketStatus(
    @Request() req,
    @Param("id") ticketId: string,
    @Body("status", new ParseEnumPipe(SupportTicketStatus))
    status: SupportTicketStatus,
    @Body("assignedToEmail") assignedToEmail?: string,
  ) {
    return this.adminService.updateTicketStatus(
      req.user.userId,
      ticketId,
      status,
      assignedToEmail,
    );
  }

  // System Monitoring
  @Get("system/health")
  @ApiOperation({ summary: "Get system health status" })
  @ApiResponse({
    status: 200,
    description: "System health retrieved successfully",
  })
  async getSystemHealth(@Request() req) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getSystemHealth();
  }

  // Admin Actions Log
  @Get("actions")
  @ApiOperation({ summary: "Get admin action logs" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiQuery({
    name: "adminUserId",
    required: false,
    type: String,
    description: "Filter by admin user ID",
  })
  @ApiResponse({
    status: 200,
    description: "Admin actions retrieved successfully",
  })
  async getAdminActions(
    @Request() req,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("adminUserId") adminUserId?: string,
  ) {
    await this.adminService.validateAdminUser(req.user.userId);
    return this.adminService.getAdminActions(page, limit, adminUserId);
  }
}
