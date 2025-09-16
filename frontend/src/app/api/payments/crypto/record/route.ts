import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

interface CryptoPaymentRecord {
  planId: string;
  signature: string;
  amount: number;
  currency: string;
  wallet: string;
  network: string;
}

interface PaymentTransaction {
  id: string;
  planId: string;
  signature: string;
  amount: number;
  currency: string;
  wallet: string;
  network: string;
  status: "pending" | "confirmed" | "failed";
  blockHeight?: number;
  confirmedAt?: Date;
  createdAt: Date;
}

// In-memory storage for demo - use proper database in production
const paymentTransactions: PaymentTransaction[] = [];

export async function POST(request: NextRequest) {
  try {
    const body: CryptoPaymentRecord = await request.json();
    const { planId, signature, amount, currency, wallet, network } = body;

    // Validate the transaction on Solana
    const connection = new Connection(
      process.env.N0DE_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
    );

    try {
      // Verify transaction exists and is confirmed
      const txInfo = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!txInfo) {
        return NextResponse.json(
          { error: "Transaction not found or not confirmed" },
          { status: 400 },
        );
      }

      // Verify transaction details
      const expectedTreasuryKey = new PublicKey(process.env.TREASURY_WALLET!);
      const payerKey = new PublicKey(wallet);

      // Check if transaction involves correct accounts
      const accountKeys = txInfo.transaction.message.getAccountKeys();
      const hasTreasury = accountKeys
        .keySegments()
        .flat()
        .some((key: PublicKey) => key.equals(expectedTreasuryKey));
      const hasPayer = accountKeys
        .keySegments()
        .flat()
        .some((key: PublicKey) => key.equals(payerKey));

      if (!hasTreasury || !hasPayer) {
        return NextResponse.json(
          { error: "Transaction does not involve expected accounts" },
          { status: 400 },
        );
      }

      // Record successful payment
      const paymentRecord: PaymentTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId,
        signature,
        amount,
        currency,
        wallet,
        network,
        status: "confirmed",
        blockHeight: txInfo.slot,
        confirmedAt: new Date(),
        createdAt: new Date(),
      };

      paymentTransactions.push(paymentRecord);

      // In production:
      // 1. Save to database
      // 2. Create/update customer subscription
      // 3. Send confirmation email
      // 4. Trigger webhook notifications
      // 5. Update user API limits

      await activateSubscription(wallet, planId);

      return NextResponse.json({
        success: true,
        transactionId: paymentRecord.id,
        status: "confirmed",
        message: "Payment recorded successfully",
      });
    } catch (error) {
      console.error("Transaction verification failed:", error);

      // Record as pending for manual review
      const pendingRecord: PaymentTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId,
        signature,
        amount,
        currency,
        wallet,
        network,
        status: "pending",
        createdAt: new Date(),
      };

      paymentTransactions.push(pendingRecord);

      return NextResponse.json({
        success: true,
        transactionId: pendingRecord.id,
        status: "pending",
        message: "Payment recorded, pending verification",
      });
    }
  } catch (error) {
    console.error("Payment recording failed:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 },
    );
  }
}

async function activateSubscription(wallet: string, planId: string) {
  // In production, this would:
  // 1. Create customer record in database
  // 2. Set API rate limits based on plan
  // 3. Generate API keys
  // 4. Send welcome email
  // 5. Update billing cycle

  const planLimits = {
    starter: { rps: 5000, monthlyRequests: 1000000 },
    professional: { rps: 25000, monthlyRequests: 5000000 },
    enterprise: { rps: -1, monthlyRequests: 50000000 }, // -1 = unlimited
  };

  const limits =
    planLimits[planId as keyof typeof planLimits] || planLimits.professional;

  console.log(`Activating ${planId} plan for wallet ${wallet}:`, limits);

  // Mock activation - replace with actual database operations
  return {
    customerId: `cust_${wallet.slice(0, 8)}`,
    planId,
    limits,
    activatedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  const signature = searchParams.get("signature");

  if (signature) {
    const transaction = paymentTransactions.find(
      (tx) => tx.signature === signature,
    );
    return NextResponse.json({ transaction });
  }

  if (wallet) {
    const transactions = paymentTransactions.filter(
      (tx) => tx.wallet === wallet,
    );
    return NextResponse.json({ transactions });
  }

  return NextResponse.json({ transactions: paymentTransactions });
}
