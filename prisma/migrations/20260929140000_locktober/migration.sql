-- CreateEnum
CREATE TYPE "public"."LocktoberVisibility" AS ENUM ('PRIVATE', 'LINK', 'PUBLIC');

-- CreateEnum
CREATE TYPE "public"."LocktoberCumDayStatus" AS ENUM ('SCHEDULED', 'LOCKED', 'CLAIMED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."LocktoberTaskKind" AS ENUM ('REWARD', 'PENALTY');

-- CreateEnum
CREATE TYPE "public"."LocktoberTaskMode" AS ENUM ('FIXED', 'PER_MINUTE', 'ENTER_AMOUNT');

-- CreateEnum
CREATE TYPE "public"."LocktoberCadence" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "hideLocktoberBoard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."LocktoberChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "allowedOrgasms" INTEGER NOT NULL,
    "visibility" "public"."LocktoberVisibility" NOT NULL DEFAULT 'PRIVATE',
    "shareSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocktoberChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberRewardTier" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "orgasmType" "public"."OrgasmType",
    "expectsLocked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "LocktoberRewardTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberCumDay" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "public"."LocktoberCumDayStatus" NOT NULL DEFAULT 'SCHEDULED',
    "pointsAtLock" INTEGER,
    "tierSnapshot" JSONB,
    "claimedTierLabel" TEXT,
    "orgasmId" TEXT,
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "LocktoberCumDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberTask" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "public"."LocktoberTaskKind" NOT NULL,
    "points" INTEGER,
    "mode" "public"."LocktoberTaskMode" NOT NULL,
    "cadence" "public"."LocktoberCadence" NOT NULL,
    "maxCompletions" INTEGER,
    "maxPoints" INTEGER,
    "noteRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocktoberTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberCompletion" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "taskId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "minutes" INTEGER,
    "note" TEXT,
    "pointsAwarded" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "LocktoberCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberLike" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocktoberLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LocktoberComment" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocktoberComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberChallenge_shareSlug_key" ON "public"."LocktoberChallenge"("shareSlug");

-- CreateIndex
CREATE INDEX "LocktoberChallenge_userId_idx" ON "public"."LocktoberChallenge"("userId");

-- CreateIndex
CREATE INDEX "LocktoberChallenge_visibility_year_idx" ON "public"."LocktoberChallenge"("visibility", "year");

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberChallenge_userId_year_key" ON "public"."LocktoberChallenge"("userId", "year");

-- CreateIndex
CREATE INDEX "LocktoberRewardTier_challengeId_idx" ON "public"."LocktoberRewardTier"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberCumDay_orgasmId_key" ON "public"."LocktoberCumDay"("orgasmId");

-- CreateIndex
CREATE INDEX "LocktoberCumDay_challengeId_idx" ON "public"."LocktoberCumDay"("challengeId");

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberCumDay_challengeId_date_key" ON "public"."LocktoberCumDay"("challengeId", "date");

-- CreateIndex
CREATE INDEX "LocktoberTask_challengeId_idx" ON "public"."LocktoberTask"("challengeId");

-- CreateIndex
CREATE INDEX "LocktoberCompletion_challengeId_completedAt_idx" ON "public"."LocktoberCompletion"("challengeId", "completedAt");

-- CreateIndex
CREATE INDEX "LocktoberCompletion_taskId_idx" ON "public"."LocktoberCompletion"("taskId");

-- CreateIndex
CREATE INDEX "LocktoberLike_challengeId_idx" ON "public"."LocktoberLike"("challengeId");

-- CreateIndex
CREATE INDEX "LocktoberLike_userId_idx" ON "public"."LocktoberLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LocktoberLike_challengeId_userId_key" ON "public"."LocktoberLike"("challengeId", "userId");

-- CreateIndex
CREATE INDEX "LocktoberComment_challengeId_createdAt_idx" ON "public"."LocktoberComment"("challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "LocktoberComment_userId_idx" ON "public"."LocktoberComment"("userId");
