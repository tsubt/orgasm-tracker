-- CreateEnum
CREATE TYPE "public"."LocktoberRateUnit" AS ENUM ('HOUR', 'DAY');

-- AlterEnum
ALTER TYPE "public"."LocktoberTaskMode" ADD VALUE 'TIME_LOCKED';

-- AlterTable
ALTER TABLE "public"."LocktoberTask" ADD COLUMN "rateEvery" INTEGER,
ADD COLUMN "rateUnit" "public"."LocktoberRateUnit";
