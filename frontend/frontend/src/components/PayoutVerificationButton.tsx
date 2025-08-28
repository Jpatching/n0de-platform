'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ExternalLink, CheckCircle, AlertCircle, Clock, Copy } from 'lucide-react';

interface PayoutVerificationButtonProps {
  matchId: string;
  isWinner?: boolean;
  className?: string;
}

export default function PayoutVerificationButton({ 
  matchId, 
  isWinner = false, 
  className = '' 
}: PayoutVerificationButtonProps) {
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const verifyPayout = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/matches/verify-payout/${matchId}`);
      const data = await response.json();
      setVerificationData(data);
      setShowDetails(true);
    } catch (error) {
      console.error('Failed to verify payout:', error);
      setVerificationData({ error: 'Failed to verify payout' });
      setShowDetails(true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusBadge = () => {
    if (!verificationData) return null;
    
    if (verificationData.error) {
      return <Badge variant="destructive" className="ml-2"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
    }
    
    if (verificationData.blockchainVerification?.payoutVerified) {
      return <Badge variant="default" className="ml-2 bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
    }
    
    if (verificationData.transactionDetails?.status === 'success') {
      return <Badge variant="secondary" className="ml-2"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
    }
    
    return <Badge variant="outline" className="ml-2"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className={className}>
      <Button 
        onClick={verifyPayout} 
        disabled={loading}
        variant={isWinner ? "default" : "outline"}
        size="sm"
        className={isWinner ? "bg-green-600 hover:bg-green-700" : ""}
      >
        {loading ? 'Verifying...' : isWinner ? 'Verify My Payout' : 'Check Payout'}
        {getStatusBadge()}
      </Button>

      {showDetails && verificationData && (
        <Card className="mt-4 max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center">
              Payout Verification Report
              {verificationData.error ? (
                <AlertCircle className="w-5 h-5 ml-2 text-red-500" />
              ) : (
                <CheckCircle className="w-5 h-5 ml-2 text-green-500" />
              )}
            </CardTitle>
            <CardDescription>
              Match ID: {matchId}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {verificationData.error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{verificationData.error}</p>
                {verificationData.message && (
                  <p className="text-red-600 text-sm mt-1">{verificationData.message}</p>
                )}
              </div>
            ) : (
              <>
                {/* Winner Information */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Winner Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Wallet:</strong> {verificationData.winner?.wallet}</p>
                    <p><strong>Username:</strong> {verificationData.winner?.username || 'Anonymous'}</p>
                    <p><strong>Expected Payout:</strong> {(verificationData.winner?.expectedPayout / 1000000000).toFixed(4)} SOL</p>
                  </div>
                </div>

                {/* Transaction Hash */}
                {verificationData.cryptographicProof?.transactionHash && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">Transaction Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {verificationData.cryptographicProof.transactionHash}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(verificationData.cryptographicProof.transactionHash)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(verificationData.manualVerification?.transactionUrl, '_blank')}
                          disabled={!verificationData.manualVerification?.transactionUrl}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Transaction
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(verificationData.manualVerification?.explorerUrl, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Wallet
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payout Breakdown */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <h3 className="font-semibold mb-2">Payout Breakdown</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Total Pot:</div>
                    <div>{(verificationData.payoutBreakdown?.totalPot / 1000000000).toFixed(4)} SOL</div>
                    
                    <div>Platform Fee (6.5%):</div>
                    <div>{(verificationData.payoutBreakdown?.platformFee / 1000000000).toFixed(4)} SOL</div>
                    
                    <div className="font-semibold">Winner Receives:</div>
                    <div className="font-semibold text-green-600">
                      {(verificationData.payoutBreakdown?.winnerReceives / 1000000000).toFixed(4)} SOL
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                {verificationData.blockchainVerification && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-semibold text-purple-800 mb-2">Blockchain Verification</h3>
                    <div className="space-y-1 text-sm">
                      {verificationData.blockchainVerification.payoutVerified ? (
                        <p className="text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Payout verified on blockchain
                        </p>
                      ) : (
                        <p className="text-yellow-600 flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Verification in progress
                        </p>
                      )}
                      
                      {verificationData.blockchainVerification.error && (
                        <p className="text-red-600">{verificationData.blockchainVerification.error}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Verification Steps */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">Manual Verification Steps</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                    {verificationData.manualVerification?.steps?.map((step: string, index: number) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 