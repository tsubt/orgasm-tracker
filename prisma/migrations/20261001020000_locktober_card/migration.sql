-- CreateTable
CREATE TABLE "LocktoberCard" (
    "challengeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "display" TEXT NOT NULL,
    "username" TEXT,
    "shareSlug" TEXT NOT NULL,
    "visibility" "LocktoberVisibility" NOT NULL,
    "lockedMinutes" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "daysLeft" INTEGER,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocktoberCard_pkey" PRIMARY KEY ("challengeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberCard_shareSlug_key" ON "LocktoberCard"("shareSlug");

-- CreateIndex
CREATE INDEX "LocktoberCard_username_year_idx" ON "LocktoberCard"("username", "year");

-- AddForeignKey
ALTER TABLE "LocktoberCard" ADD CONSTRAINT "LocktoberCard_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
