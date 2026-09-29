-- DropIndex
DROP INDEX "public"."Orgasm_userId_idx";

-- CreateIndex
CREATE INDEX "Orgasm_userId_timestamp_idx" ON "public"."Orgasm"("userId", "timestamp");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Orgasm" ADD CONSTRAINT "Orgasm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DashboardChart" ADD CONSTRAINT "DashboardChart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChastitySession" ADD CONSTRAINT "ChastitySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberChallenge" ADD CONSTRAINT "LocktoberChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberRewardTier" ADD CONSTRAINT "LocktoberRewardTier_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberCumDay" ADD CONSTRAINT "LocktoberCumDay_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberCumDay" ADD CONSTRAINT "LocktoberCumDay_orgasmId_fkey" FOREIGN KEY ("orgasmId") REFERENCES "public"."Orgasm"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberTask" ADD CONSTRAINT "LocktoberTask_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberCompletion" ADD CONSTRAINT "LocktoberCompletion_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberCompletion" ADD CONSTRAINT "LocktoberCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."LocktoberTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberLike" ADD CONSTRAINT "LocktoberLike_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberLike" ADD CONSTRAINT "LocktoberLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberComment" ADD CONSTRAINT "LocktoberComment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "public"."LocktoberChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocktoberComment" ADD CONSTRAINT "LocktoberComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
