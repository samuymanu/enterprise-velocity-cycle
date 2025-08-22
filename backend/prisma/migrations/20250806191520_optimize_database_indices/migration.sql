/*
  Warnings:

  - The values [TECHNICIAN,CASHIER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `creditLimit` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `currentBalance` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `postalCode` on the `customers` table. All the data in the column will be lost.
  - The `status` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[code]` on the table `categories` will be added. If there are existing duplicate values, this will fail.
  - Made the column `code` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `documentType` on the `customers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `updatedAt` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CI', 'RIF', 'PASSPORT');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';
COMMIT;

-- DropIndex
DROP INDEX "categories_level_idx";

-- DropIndex
DROP INDEX "categories_name_parentId_key";

-- DropIndex
DROP INDEX "categories_parentId_idx";

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "creditLimit",
DROP COLUMN "currentBalance",
DROP COLUMN "postalCode",
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'Venezuela',
DROP COLUMN "documentType",
ADD COLUMN     "documentType" "DocumentType" NOT NULL,
ALTER COLUMN "customerType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_brandId_idx" ON "products"("brandId");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");
