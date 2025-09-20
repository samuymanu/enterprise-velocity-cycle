-- CreateEnum
CREATE TYPE "BarcodeFormat" AS ENUM ('EAN13', 'UPC_A', 'UPC_E', 'CODE128', 'CODE39', 'QR_CODE', 'DATA_MATRIX', 'PDF417');

-- CreateEnum
CREATE TYPE "BarcodeType" AS ENUM ('PRODUCT', 'BATCH', 'SERIAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "barcodes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "format" "BarcodeFormat" NOT NULL,
    "type" "BarcodeType" NOT NULL DEFAULT 'PRODUCT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barcodes_code_key" ON "barcodes"("code");

-- CreateIndex
CREATE INDEX "barcodes_productId_idx" ON "barcodes"("productId");

-- CreateIndex
CREATE INDEX "barcodes_code_idx" ON "barcodes"("code");

-- CreateIndex
CREATE INDEX "barcodes_format_idx" ON "barcodes"("format");

-- CreateIndex
CREATE INDEX "barcodes_type_idx" ON "barcodes"("type");

-- CreateIndex
CREATE INDEX "barcodes_isActive_idx" ON "barcodes"("isActive");

-- CreateIndex
CREATE INDEX "barcodes_productId_isPrimary_idx" ON "barcodes"("productId", "isPrimary");

-- AddForeignKey
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
