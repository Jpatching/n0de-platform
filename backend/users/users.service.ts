import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
        createdAt: true,
        subscriptions: {
          select: {
            planType: true,
            status: true,
            currentPeriodEnd: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async update(userId: string, updateData: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        username: updateData.username,
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        avatar: updateData.avatar,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        emailVerified: true,
      },
    });
  }

  async getUsageSummary(userId: string) {
    // Get user's subscription and usage data
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get monthly usage
    const monthlyUsage = await this.prisma.billingUsage.aggregate({
      where: {
        userId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _sum: {
        requestsUsed: true,
      },
    });

    // Get daily average
    const daysInMonth = now.getDate();
    const totalRequests = monthlyUsage._sum.requestsUsed || 0;
    const dailyAverage = Math.round(totalRequests / daysInMonth);

    // Get subscription limits
    const limits = {
      STARTER: 1000000,
      PROFESSIONAL: 5000000,
      ENTERPRISE: 99999999,
    };

    const monthlyLimit = limits[subscription?.planType || "STARTER"];
    const remainingQuota = monthlyLimit - totalRequests;

    return {
      totalRequests,
      dailyAverage,
      monthlyTotal: totalRequests,
      remainingQuota: Math.max(0, remainingQuota),
      subscriptionType: subscription?.planType || "STARTER",
      monthlyLimit,
    };
  }

  async getPaymentMethods(userId: string) {
    // In production, this would fetch from Stripe or your payment provider
    // For now, return empty array to show proper empty state instead of placeholder
    try {
      // Example: const customer = await stripe.customers.retrieve(stripeCustomerId);
      // const paymentMethods = await stripe.paymentMethods.list({ customer: customer.id });

      // For demonstration, return empty array which will show proper "No payment methods" UI
      return [];

      // In real implementation, would return something like:
      // return paymentMethods.data.map(pm => ({
      //   id: pm.id,
      //   type: pm.type,
      //   last4: pm.card?.last4,
      //   brand: pm.card?.brand,
      //   expiryMonth: pm.card?.exp_month,
      //   expiryYear: pm.card?.exp_year,
      //   isDefault: pm.id === customer.invoice_settings.default_payment_method
      // }));
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      return [];
    }
  }

  async getBillingAddress(userId: string) {
    try {
      // In production, fetch from user profile or Stripe customer
      // For now, return null to show proper empty state instead of placeholder

      // Example implementation:
      // const user = await this.prisma.user.findUnique({
      //   where: { id: userId },
      //   include: { billingAddress: true }
      // });
      //
      // if (user?.billingAddress) {
      //   return {
      //     name: user.billingAddress.name,
      //     line1: user.billingAddress.line1,
      //     line2: user.billingAddress.line2,
      //     city: user.billingAddress.city,
      //     state: user.billingAddress.state,
      //     postalCode: user.billingAddress.postalCode,
      //     country: user.billingAddress.country,
      //   };
      // }

      return null; // Shows proper "No billing address" UI instead of fake data
    } catch (error) {
      console.error("Error fetching billing address:", error);
      return null;
    }
  }

  async updateBillingAddress(userId: string, addressData: any) {
    try {
      // In production, update user billing address
      // const updatedAddress = await this.prisma.billingAddress.upsert({
      //   where: { userId },
      //   create: { userId, ...addressData },
      //   update: addressData,
      // });
      // return updatedAddress;

      return {
        message: "Billing address update functionality will be implemented",
      };
    } catch (error) {
      console.error("Error updating billing address:", error);
      throw error;
    }
  }

  async getTeamMembers(userId: string) {
    try {
      // First get user's subscription to check if they're Enterprise
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscriptions: true,
        },
      });

      // Check if user has Enterprise plan
      const hasEnterprisePlan = user?.subscriptions?.some(
        (sub) => sub.planType === "ENTERPRISE" && sub.status === "ACTIVE",
      );

      if (!hasEnterprisePlan) {
        return []; // Non-enterprise users get empty team list
      }

      // Return the current user as owner and some mock team members for testing
      // In production, this would query a proper team members table
      const teamMembers: Array<{
        id: string;
        name: string;
        email: string;
        role: "owner" | "admin" | "developer" | "viewer";
        avatar: string | null;
        lastActive: string;
        status: "active" | "pending" | "inactive";
      }> = [
        {
          id: user.id,
          name:
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.username ||
            "Team Owner",
          email: user.email,
          role: "owner",
          avatar: user.avatar || null,
          lastActive: new Date().toISOString(),
          status: "active",
        },
      ];

      // Add mock team members for Enterprise users (for demonstration)
      if (hasEnterprisePlan) {
        teamMembers.push(
          {
            id: "team-member-1",
            name: "Sarah Johnson",
            email: "sarah.johnson@example.com",
            role: "admin",
            avatar: null,
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            status: "active",
          },
          {
            id: "team-member-2",
            name: "Mike Chen",
            email: "mike.chen@example.com",
            role: "developer",
            avatar: null,
            lastActive: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ).toISOString(), // 1 day ago
            status: "active",
          },
          {
            id: "team-member-3",
            name: "Emily Davis",
            email: "emily.davis@example.com",
            role: "developer",
            avatar: null,
            lastActive: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 3 days ago
            status: "pending",
          },
          {
            id: "team-member-4",
            name: "Alex Thompson",
            email: "alex.thompson@example.com",
            role: "viewer",
            avatar: null,
            lastActive: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 1 week ago
            status: "inactive",
          },
        );
      }

      return teamMembers;

      // Production implementation would be:
      // const teamMembers = await this.prisma.teamMember.findMany({
      //   where: { teamId: user.teamId },
      //   include: { user: true }
      // });
      // return teamMembers.map(member => ({ ... }));
    } catch (error) {
      console.error("Error fetching team members:", error);
      return [];
    }
  }
}
