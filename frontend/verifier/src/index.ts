import { Keypair, PublicKey } from '@solana/web3.js';
import { createHash } from 'crypto';
import express from 'express';
import { z } from 'zod';

const app = express();
app.use(express.json());

// Load verifier keypair (in production this would be from secure storage)
const verifierKeypair = Keypair.generate(); // TODO: Replace with actual keypair

// Schema for match result validation
const MatchResultSchema = z.object({
  matchId: z.string(),
  gameId: z.string(),
  winner: z.string(),
  loser: z.string(),
  gameData: z.record(z.unknown()),
  timestamp: z.number(),
});

type MatchResult = z.infer<typeof MatchResultSchema>;

// Verify and sign match results
app.post('/verify', async (req, res) => {
  try {
    const matchResult = MatchResultSchema.parse(req.body);
    
    // Verify game-specific rules
    if (!verifyGameRules(matchResult)) {
      return res.status(400).json({ error: 'Invalid game result' });
    }
    
    // Create result hash
    const resultHash = createResultHash(matchResult);
    
    // Sign the result
    const signature = verifierKeypair.sign(resultHash);
    
    // Log for audit
    logMatchResult(matchResult, resultHash, signature);
    
    return res.json({
      signature: Buffer.from(signature).toString('base64'),
      verifier: verifierKeypair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(400).json({ error: 'Invalid request format' });
  }
});

function verifyGameRules(matchResult: MatchResult): boolean {
  // TODO: Implement game-specific verification logic
  // This would validate game state, moves, and outcome
  return true;
}

function createResultHash(matchResult: MatchResult): Buffer {
  const data = JSON.stringify({
    matchId: matchResult.matchId,
    winner: matchResult.winner,
    timestamp: matchResult.timestamp,
  });
  return Buffer.from(createHash('sha256').update(data).digest());
}

function logMatchResult(
  matchResult: MatchResult,
  resultHash: Buffer,
  signature: Uint8Array
) {
  // TODO: Implement secure logging for audit trail
  console.log({
    timestamp: new Date().toISOString(),
    matchResult,
    resultHash: resultHash.toString('hex'),
    signature: Buffer.from(signature).toString('base64'),
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Verifier service running on port ${PORT}`);
}); 