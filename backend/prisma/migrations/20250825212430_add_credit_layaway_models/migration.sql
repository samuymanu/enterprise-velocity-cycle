-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('PENDIENTE', 'PAGADO', 'VENCIDO', 'ELIMINADO');

-- CreateEnum
CREATE TYPE "LayawayStatus" AS ENUM ('ACTIVO', 'COMPLETADO', 'CANCELADO', 'ELIMINADO');

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "CreditStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "creditId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Layaway" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "LayawayStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Layaway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayawayPayment" (
    "id" TEXT NOT NULL,
    "layawayId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayawayPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Credit_saleId_key" ON "Credit"("saleId");

-- CreateIndex
CREATE INDEX "Credit_customerId_idx" ON "Credit"("customerId");

-- CreateIndex
CREATE INDEX "Credit_saleId_idx" ON "Credit"("saleId");

-- CreateIndex
CREATE INDEX "Installment_creditId_idx" ON "Installment"("creditId");

-- CreateIndex
CREATE UNIQUE INDEX "Layaway_saleId_key" ON "Layaway"("saleId");

-- CreateIndex
CREATE INDEX "Layaway_customerId_idx" ON "Layaway"("customerId");

-- CreateIndex
CREATE INDEX "Layaway_saleId_idx" ON "Layaway"("saleId");

-- CreateIndex
CREATE INDEX "LayawayPayment_layawayId_idx" ON "LayawayPayment"("layawayId");

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_creditId_fkey" FOREIGN KEY ("creditId") REFERENCES "Credit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Layaway" ADD CONSTRAINT "Layaway_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Layaway" ADD CONSTRAINT "Layaway_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayawayPayment" ADD CONSTRAINT "LayawayPayment_layawayId_fkey" FOREIGN KEY ("layawayId") REFERENCES "Layaway"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
