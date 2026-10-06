-- CreateTable
CREATE TABLE "kv_entries" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "kv_entries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "kv_entries_expiresAt_idx" ON "kv_entries"("expiresAt");
