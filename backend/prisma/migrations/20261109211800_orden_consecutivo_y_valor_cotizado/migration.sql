-- AlterTable
ALTER TABLE "OrdenServicio" ADD COLUMN     "aprobadaEn" TIMESTAMP(3),
ADD COLUMN     "valorCotizado" INTEGER;

-- CreateTable
CREATE TABLE "ConsecutivoOrden" (
    "anio" INTEGER NOT NULL,
    "ultimo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConsecutivoOrden_pkey" PRIMARY KEY ("anio")
);

-- CreateIndex
CREATE INDEX "OrdenServicio_creadoEn_idx" ON "OrdenServicio"("creadoEn");
