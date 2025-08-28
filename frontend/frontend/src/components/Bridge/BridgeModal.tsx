import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowRight, Wallet, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { io, Socket } from 'socket.io-client';

interface BridgeQuote {
  sourceChain: string;
  targetChain: string;
  sourceToken: string;
  targetToken: string;
  amount: string;
  estimatedGasFee: string;
  bridgeFee: string;
  convenienceFee: string;
  totalFee: string;
  netAmount: string;
  estimatedTime: string;
}

interface BridgeStatus {
  id: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: string;
  error?: string;
}

interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (amount: string) => void;
}

const SUPPORTED_CHAINS = [
  { id: 'Ethereum', name: 'Ethereum', logo: '/logos/ethereum.png' },
  { id: 'Polygon', name: 'Polygon', logo: '/logos/polygon.png' },
  { id: 'BNB', name: 'BNB Chain', logo: '/logos/bsc.png' },
  { id: 'Solana', name: 'Solana', icon: '◎' },
];

const SUPPORTED_TOKENS = [
  { id: 'ETH', name: 'Ethereum', symbol: 'ETH' },
  { id: 'USDC', name: 'USD Coin', symbol: 'USDC' },
  { id: 'USDT', name: 'Tether', symbol: 'USDT' },
];

export function BridgeModal({ isOpen, onClose, onSuccess }: BridgeModalProps) {
  const [step, setStep] = useState<'select' | 'quote' | 'bridging' | 'complete'>('select');
  const [sourceChain, setSourceChain] = useState('');
  const [token, setToken] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { toast } = useToast();

  // API Base URL
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app') + '/api/v1';

  // Initialize WebSocket connection
  useEffect(() => {
    if (isOpen && !socket) {
      const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL || 'https://pv3-backend-api-production.up.railway.app'}/bridge`);
      
      newSocket.on('connect', () => {
        console.log('🔌 Connected to bridge WebSocket');
      });

      newSocket.on('bridge-transaction-update', (data: BridgeStatus & { timestamp: string }) => {
        console.log('📡 Bridge status update:', data);
        setBridgeStatus(data);
      });

      newSocket.on('bridge-completed', (data: any) => {
        console.log('🎉 Bridge completed:', data);
        setStep('complete');
        onSuccess(data.amount);
        toast({
          title: 'Bridge Complete! 🎉',
          description: data.message,
        });
      });

      newSocket.on('bridge-failed', (data: any) => {
        console.log('❌ Bridge failed:', data);
        setBridgeStatus(prev => prev ? { ...prev, status: 'failed', error: data.error } : null);
        toast({
          title: 'Bridge Failed',
          description: data.error,
          variant: 'destructive',
        });
      });

      setSocket(newSocket);
    }

    return () => {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    };
  }, [isOpen]);

  // Subscribe to transaction updates when bridging starts
  useEffect(() => {
    if (socket && transactionId && step === 'bridging') {
      socket.emit('subscribe-bridge-transaction', { transactionId });
      
      return () => {
        socket.emit('unsubscribe-bridge-transaction', { transactionId });
      };
    }
  }, [socket, transactionId, step]);

  const resetModal = () => {
    setStep('select');
    setSourceChain('');
    setToken('');
    setAmount('');
    setQuote(null);
    setBridgeStatus(null);
    setTransactionId(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const getBridgeQuote = async () => {
    if (!sourceChain || !token || !amount) return;

    setLoading(true);
    try {
      let response;
      
      // Handle USDC-to-SOL swap on Solana
      if (sourceChain === 'Solana' && token === 'USDC') {
        response = await fetch(`${API_BASE}/bridge/usdc/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        });
      } else {
        // Handle cross-chain bridge
        response = await fetch(`${API_BASE}/bridge/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceChain,
            targetChain: 'Solana',
            token,
            amount,
          }),
        });
      }

      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);

      setQuote(data.quote || data.data);
      setStep('quote');
    } catch (error) {
      toast({
        title: 'Quote Error',
        description: 'Failed to get bridge quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateBridge = async () => {
    if (!quote) return;

    setLoading(true);
    try {
      let response;
      
      // Handle USDC-to-SOL swap on Solana
      if (sourceChain === 'Solana' && token === 'USDC') {
        response = await fetch(`${API_BASE}/bridge/usdc/swap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userPublicKey: 'user_sol_address', // Would get from Phantom
            amount: quote.amount,
          }),
        });
      } else {
        // Handle cross-chain bridge
        response = await fetch(`${API_BASE}/bridge/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceChain: quote.sourceChain,
            targetChain: quote.targetChain,
            token: quote.sourceToken,
            amount: quote.amount,
            userAddress: 'user_eth_address', // Would get from MetaMask
            targetAddress: 'user_sol_address', // Would get from Phantom
          }),
        });
      }

      const data = await response.json();
      
      if (!data.success) throw new Error(data.error);

      setTransactionId(data.transactionId || data.data.transactionId);
      setStep('bridging');
      setBridgeStatus({
        id: data.transactionId || data.data.transactionId,
        status: 'pending',
        progress: 0,
        currentStep: sourceChain === 'Solana' ? 'Preparing USDC swap...' : 'Initializing bridge transaction...',
      });

    } catch (error) {
      toast({
        title: 'Bridge Error',
        description: 'Failed to initiate bridge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Deposit Any Crypto
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-muted-foreground">
                Bridge crypto from any chain to start gaming instantly
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">From Chain</label>
                <Select value={sourceChain} onValueChange={setSourceChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source chain" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CHAINS.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id}>
                        <span className="flex items-center gap-2">
                          <span>{chain.logo ? <Image src={chain.logo} alt={chain.name} width={20} height={20} /> : chain.icon}</span>
                          {chain.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Token</label>
                <Select value={token} onValueChange={setToken}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_TOKENS.map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        <span className="flex items-center gap-2">
                          {token.symbol} - {token.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input
                  type="number"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={getBridgeQuote}
              disabled={!sourceChain || !token || !amount || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Quote...
                </>
              ) : (
                'Get Quote'
              )}
            </Button>
          </div>
        )}

        {step === 'quote' && quote && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bridge Quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium">
                    {quote.amount} {quote.sourceToken} on {quote.sourceChain}
                  </span>
                </div>
                
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium">
                    {quote.netAmount} SOL on Solana
                  </span>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Wormhole Bridge:</span>
                    <span className="text-green-600">Secure & Fast</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>You Receive:</span>
                    <span className="text-green-600">{quote.netAmount} SOL</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Powered by Wormhole • Estimated time: {quote.estimatedTime}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button onClick={initiateBridge} disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  'Confirm Bridge'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'bridging' && bridgeStatus && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {bridgeStatus.status === 'failed' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : bridgeStatus.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  )}
                  Bridge Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{bridgeStatus.progress}%</span>
                  </div>
                  <Progress value={bridgeStatus.progress} className="w-full" />
                </div>

                <div className="text-center">
                  <p className="font-medium">{bridgeStatus.currentStep}</p>
                  {bridgeStatus.estimatedTimeRemaining && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Estimated time remaining: {bridgeStatus.estimatedTimeRemaining}
                    </p>
                  )}
                </div>

                {bridgeStatus.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{bridgeStatus.error}</p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Transaction ID: {transactionId}</p>
                  {bridgeStatus.status !== 'pending' && (
                    <p>This process is automated and secure via Wormhole bridge</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {bridgeStatus.status === 'failed' && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('quote')} className="flex-1">
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Bridge Complete! 🎮</h3>
                <p className="text-muted-foreground">
                  {quote?.netAmount} SOL has been deposited directly to your session vault
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Ready for frictionless gaming - no more wallet signatures needed!
                </p>
              </div>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Amount Bridged:</span>
                    <span className="font-medium">{quote?.amount} {quote?.sourceToken}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Via Wormhole:</span>
                    <span className="text-blue-600">Secure Transfer</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Added to Vault:</span>
                    <span className="text-green-600">{quote?.netAmount} SOL</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 text-xs">
                    <Wallet className="h-4 w-4" />
                    <span>Funds are now in your secure session vault for instant gaming</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleClose} className="w-full">
              Start Gaming! 🚀
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 