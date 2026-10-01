-- AlterEnum
ALTER TYPE "public"."LocktoberRateUnit" ADD VALUE 'SECOND';
ALTER TYPE "public"."LocktoberRateUnit" ADD VALUE 'MINUTE';
ALTER TYPE "public"."LocktoberCadence" ADD VALUE 'MONTHLY';

-- AlterTable
ALTER TABLE "public"."LocktoberTask" ADD COLUMN "description" TEXT;
