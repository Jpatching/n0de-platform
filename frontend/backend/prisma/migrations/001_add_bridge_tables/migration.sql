-- CreateTable
CREATE TABLE "bridge_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceChain" TEXT NOT NULL,
    "targetChain" TEXT NOT NULL,
    "sourceToken" TEXT NOT NULL,
    "targetToken" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bridgeFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "convenienceFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceTxHash" TEXT,
    "targetTxHash" TEXT,
    "vaaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bridge_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bridge_fee_collections" (
    "id" TEXT NOT NULL,
    "bridgeId" TEXT NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "feeType" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bridge_fee_collections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bridge_transactions_userId_idx" ON "bridge_transactions"("userId");

-- CreateIndex
CREATE INDEX "bridge_transactions_status_idx" ON "bridge_transactions"("status");

-- CreateIndex
CREATE INDEX "bridge_transactions_sourceChain_idx" ON "bridge_transactions"("sourceChain");

-- CreateIndex
CREATE INDEX "bridge_transactions_createdAt_idx" ON "bridge_transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "bridge_transactions_sourceTxHash_idx" ON "bridge_transactions"("sourceTxHash");

-- CreateIndex
CREATE INDEX "bridge_fee_collections_bridgeId_idx" ON "bridge_fee_collections"("bridgeId");

-- CreateIndex
CREATE INDEX "bridge_fee_collections_collectedAt_idx" ON "bridge_fee_collections"("collectedAt");

-- CreateIndex
CREATE INDEX "bridge_fee_collections_feeType_idx" ON "bridge_fee_collections"("feeType");

-- AddForeignKey
ALTER TABLE "bridge_transactions" ADD CONSTRAINT "bridge_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bridge_fee_collections" ADD CONSTRAINT "bridge_fee_collections_bridgeId_fkey" FOREIGN KEY ("bridgeId") REFERENCES "bridge_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 