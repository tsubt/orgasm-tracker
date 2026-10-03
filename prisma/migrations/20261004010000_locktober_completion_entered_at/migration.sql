ALTER TABLE "public"."LocktoberCompletion" ADD COLUMN "enteredAt" TIMESTAMP(3);
UPDATE "public"."LocktoberCompletion" SET "enteredAt" = "completedAt" WHERE "enteredAt" IS NULL;
ALTER TABLE "public"."LocktoberCompletion" ALTER COLUMN "enteredAt" SET NOT NULL;
ALTER TABLE "public"."LocktoberCompletion" ALTER COLUMN "enteredAt" SET DEFAULT CURRENT_TIMESTAMP;
