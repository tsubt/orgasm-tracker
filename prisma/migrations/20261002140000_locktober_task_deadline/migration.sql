-- AlterTable
ALTER TABLE "public"."LocktoberTask" ADD COLUMN "deadlineMinute" INTEGER,
ADD COLUMN "missPenalty" INTEGER NOT NULL DEFAULT 0;
