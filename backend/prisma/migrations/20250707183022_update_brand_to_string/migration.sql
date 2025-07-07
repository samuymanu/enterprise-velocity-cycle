/*
  Warnings:

  - You are about to drop the column `brandId` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `brand_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `brands` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `brand` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "brand_categories" DROP CONSTRAINT "brand_categories_brandId_fkey";

-- DropForeignKey
ALTER TABLE "brand_categories" DROP CONSTRAINT "brand_categories_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_brandId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "brandId",
ADD COLUMN     "brand" TEXT NOT NULL;

-- DropTable
DROP TABLE "brand_categories";

-- DropTable
DROP TABLE "brands";
