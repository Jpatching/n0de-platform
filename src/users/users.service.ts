import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
      console.error('Error fetching payment methods:', error);
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
      console.error('Error fetching billing address:', error);
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
      
      return { message: 'Billing address update functionality will be implemented' };
    } catch (error) {
      console.error('Error updating billing address:', error);
      throw error;
    }
  }
}