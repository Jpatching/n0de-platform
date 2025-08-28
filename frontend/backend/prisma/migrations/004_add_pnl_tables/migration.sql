-- CreateTable
CREATE TABLE "PnLRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchId" TEXT,
    "gameType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "wagerAmount" DOUBLE PRECISION NOT NULL,
    "pnlAmount" DOUBLE PRECISION NOT NULL,
    "pnlPercentage" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gameSpecific" JSONB,
    "cardData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PnLRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PnLSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "winRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWagered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPnL" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestWin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "worstLoss" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyStats" JSONB,
    "weeklyStats" JSONB,
    "monthlyStats" JSONB,
    "gameTypeStats" JSONB,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestWinStreak" INTEGER NOT NULL DEFAULT 0,
    "worstLossStreak" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PnLSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PnLCardFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pnlRecordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PnLCardFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PnLCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PnLCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PnLCollectionCard" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "pnlRecordId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PnLCollectionCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PnLRecord_userId_idx" ON "PnLRecord"("userId");

-- CreateIndex
CREATE INDEX "PnLRecord_gameType_idx" ON "PnLRecord"("gameType");

-- CreateIndex
CREATE INDEX "PnLRecord_result_idx" ON "PnLRecord"("result");

-- CreateIndex
CREATE INDEX "PnLRecord_createdAt_idx" ON "PnLRecord"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "PnLRecord_pnlAmount_idx" ON "PnLRecord"("pnlAmount" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PnLSummary_userId_key" ON "PnLSummary"("userId");

-- CreateIndex
CREATE INDEX "PnLSummary_totalPnL_idx" ON "PnLSummary"("totalPnL" DESC);

-- CreateIndex
CREATE INDEX "PnLSummary_winRate_idx" ON "PnLSummary"("winRate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "PnLCardFavorite_userId_pnlRecordId_key" ON "PnLCardFavorite"("userId", "pnlRecordId");

-- CreateIndex
CREATE INDEX "PnLCollection_userId_idx" ON "PnLCollection"("userId");

-- CreateIndex
CREATE INDEX "PnLCollection_isPublic_idx" ON "PnLCollection"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "PnLCollectionCard_collectionId_pnlRecordId_key" ON "PnLCollectionCard"("collectionId", "pnlRecordId");

-- AddForeignKey
ALTER TABLE "PnLRecord" ADD CONSTRAINT "PnLRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLSummary" ADD CONSTRAINT "PnLSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLCardFavorite" ADD CONSTRAINT "PnLCardFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLCardFavorite" ADD CONSTRAINT "PnLCardFavorite_pnlRecordId_fkey" FOREIGN KEY ("pnlRecordId") REFERENCES "PnLRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLCollection" ADD CONSTRAINT "PnLCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLCollectionCard" ADD CONSTRAINT "PnLCollectionCard_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PnLCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PnLCollectionCard" ADD CONSTRAINT "PnLCollectionCard_pnlRecordId_fkey" FOREIGN KEY ("pnlRecordId") REFERENCES "PnLRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 