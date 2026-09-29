-- Backfill the automatic time-locked task onto challenges that do not have one.
INSERT INTO "public"."LocktoberTask" (
    "id",
    "challengeId",
    "title",
    "kind",
    "points",
    "mode",
    "cadence",
    "maxCompletions",
    "maxPoints",
    "noteRequired",
    "rateEvery",
    "rateUnit",
    "sortOrder",
    "createdAt"
)
SELECT
    'tl_' || c."id",
    c."id",
    'Time locked',
    'REWARD',
    1,
    'TIME_LOCKED',
    'DAILY',
    NULL,
    NULL,
    false,
    1,
    'HOUR',
    COALESCE((
        SELECT MAX(t."sortOrder") + 1
        FROM "public"."LocktoberTask" t
        WHERE t."challengeId" = c."id"
    ), 0),
    CURRENT_TIMESTAMP
FROM "public"."LocktoberChallenge" c
WHERE NOT EXISTS (
    SELECT 1
    FROM "public"."LocktoberTask" t
    WHERE t."challengeId" = c."id"
      AND t."mode" = 'TIME_LOCKED'
);
