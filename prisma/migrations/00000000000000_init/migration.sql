-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."OrgasmType" AS ENUM ('FULL', 'RUINED', 'HANDSFREE', 'ANAL');

-- CreateEnum
CREATE TYPE "public"."SexType" AS ENUM ('SOLO', 'VIRTUAL', 'PHYSICAL');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChastitySession" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "note" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ChastitySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DashboardChart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chartName" TEXT NOT NULL,
    "chartPosition" INTEGER NOT NULL,

    CONSTRAINT "DashboardChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Orgasm" (
    "id" TEXT NOT NULL,
    "note" TEXT,
    "type" "public"."OrgasmType" NOT NULL DEFAULT 'FULL',
    "sex" "public"."SexType" NOT NULL DEFAULT 'SOLO',
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3),

    CONSTRAINT "Orgasm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicOrgasms" BOOLEAN NOT NULL DEFAULT false,
    "publicProfile" BOOLEAN NOT NULL DEFAULT false,
    "bio" TEXT,
    "defaultProfileChart" TEXT,
    "trackChastityStatus" BOOLEAN NOT NULL DEFAULT false,
    "firstDayOfWeek" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "ChastitySession_userId_idx" ON "public"."ChastitySession"("userId" ASC);

-- CreateIndex
CREATE INDEX "ChastitySession_userId_startTime_idx" ON "public"."ChastitySession"("userId" ASC, "startTime" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardChart_userId_chartPosition_key" ON "public"."DashboardChart"("userId" ASC, "chartPosition" ASC);

-- CreateIndex
CREATE INDEX "DashboardChart_userId_idx" ON "public"."DashboardChart"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "public"."Follow"("followerId" ASC, "followingId" ASC);

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "public"."Follow"("followerId" ASC);

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "public"."Follow"("followingId" ASC);

-- CreateIndex
CREATE INDEX "Orgasm_userId_idx" ON "public"."Orgasm"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

