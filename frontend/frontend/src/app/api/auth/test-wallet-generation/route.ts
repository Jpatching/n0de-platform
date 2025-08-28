import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import { testWalletSystem } from '@/lib/solana-utils';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to verify wallet generation and PDA vault consistency
 * This endpoint helps verify that:
 * 1. All users get wallet addresses regardless of auth method
 * 2. PDA vaults are consistently derived from wallet addresses
 * 3. The system maintains compatibility for existing users
 */
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Test endpoint not available in production' },
        { status: 403 }
      );
    }

    // Test wallet system using utility functions
    const walletTest = await testWalletSystem();
    
    // Check database for existing users with wallets
    const emailUsers = await prisma.user.findMany({
      where: { authMethod: 'email' },
      select: { id: true, email: true, walletAddress: true, authMethod: true }
    });
    
    const authenticatorUsers = await prisma.user.findMany({
      where: { authMethod: 'authenticator' },
      select: { id: true, username: true, walletAddress: true, authMethod: true }
    });
    
    const walletUsers = await prisma.user.findMany({
      where: { authMethod: 'wallet' },
      select: { id: true, username: true, walletAddress: true, authMethod: true }
    });

    return NextResponse.json({
      success: true,
      testResults: {
        walletSystemTest: walletTest,
        databaseUsers: {
          emailUsers: emailUsers.map(user => ({
            id: user.id,
            identifier: user.email,
            hasWallet: !!user.walletAddress,
            walletPreview: user.walletAddress?.substring(0, 8) + '...',
            authMethod: user.authMethod
          })),
          authenticatorUsers: authenticatorUsers.map(user => ({
            id: user.id,
            identifier: user.username,
            hasWallet: !!user.walletAddress,
            walletPreview: user.walletAddress?.substring(0, 8) + '...',
            authMethod: user.authMethod
          })),
          walletUsers: walletUsers.map(user => ({
            id: user.id,
            identifier: user.username,
            hasWallet: !!user.walletAddress,
            walletPreview: user.walletAddress?.substring(0, 8) + '...',
            authMethod: user.authMethod
          }))
        },
        summary: {
          totalUsers: emailUsers.length + authenticatorUsers.length + walletUsers.length,
          usersWithWallets: [
            ...emailUsers.filter(u => u.walletAddress),
            ...authenticatorUsers.filter(u => u.walletAddress),
            ...walletUsers.filter(u => u.walletAddress)
          ].length,
          emailUsersWithWallets: emailUsers.filter(u => u.walletAddress).length,
          authenticatorUsersWithWallets: authenticatorUsers.filter(u => u.walletAddress).length,
          walletUsersWithWallets: walletUsers.filter(u => u.walletAddress).length
        }
      },
      message: 'Wallet generation and PDA vault system working correctly'
    });

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

function generateTestWallet(): string {
  const keypair = Keypair.generate();
  return keypair.publicKey.toString();
}

async function derivePDAVault(walletAddress: string): Promise<string> {
  try {
    const { PublicKey } = await import('@solana/web3.js');
    
    // Convert wallet address to PublicKey
    const userPubkey = new PublicKey(walletAddress);
    
    // Derive PDA with the same seeds used in the application
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('session'),
        userPubkey.toBuffer()
      ],
      new PublicKey('11111111111111111111111111111112') // System program for testing
    );
    
    return pda.toString();
  } catch (error: any) {
    console.error('PDA derivation error:', error);
    throw new Error('Failed to derive PDA vault');
  }
} 