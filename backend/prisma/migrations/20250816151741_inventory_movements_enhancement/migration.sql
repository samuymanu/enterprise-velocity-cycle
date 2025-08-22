/*
  Warnings:

  - Added the required column `updatedAt` to the `inventory_moves` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "inventory_moves" DROP CONSTRAINT "inventory_moves_productId_fkey";

-- AlterTable
ALTER TABLE "inventory_moves" ADD COLUMN     "batchNumber" TEXT,
ADD COLUMN     "cost" DECIMAL(10,2),
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedBy" TEXT;

-- CreateIndex
CREATE INDEX "inventory_moves_productId_idx" ON "inventory_moves"("productId");

-- CreateIndex
CREATE INDEX "inventory_moves_type_idx" ON "inventory_moves"("type");

-- CreateIndex
CREATE INDEX "inventory_moves_userId_idx" ON "inventory_moves"("userId");

-- CreateIndex
CREATE INDEX "inventory_moves_createdAt_idx" ON "inventory_moves"("createdAt");

-- CreateIndex
CREATE INDEX "inventory_moves_productId_createdAt_idx" ON "inventory_moves"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "inventory_moves_type_createdAt_idx" ON "inventory_moves"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "inventory_moves" ADD CONSTRAINT "inventory_moves_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_moves" ADD CONSTRAINT "inventory_moves_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_moves" ADD CONSTRAINT "inventory_moves_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
