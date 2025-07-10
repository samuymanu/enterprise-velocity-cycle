/*
  Warnings:

  - You are about to drop the column `createdAt` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `products` table. All the data in the column will be lost.
  - You are about to alter the column `costPrice` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `salePrice` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - The `status` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_categoryId_fkey";

-- DropIndex
DROP INDEX "products_barcode_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "datasheetUrl" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "tags" TEXT[],
ALTER COLUMN "categoryId" DROP NOT NULL,
ALTER COLUMN "costPrice" SET DEFAULT 0,
ALTER COLUMN "costPrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "salePrice" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "minStock" SET DEFAULT 10,
ALTER COLUMN "images" DROP DEFAULT,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "brand" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
