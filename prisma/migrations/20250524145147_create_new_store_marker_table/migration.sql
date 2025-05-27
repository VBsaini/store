-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "shop" JSONB[],
    "accessToken" TEXT NOT NULL,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_shop_key" ON "store"("shop");
