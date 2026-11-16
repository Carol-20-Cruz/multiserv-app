/*
  Warnings:

  - Added the required column `tipoEquipoId` to the `Repuesto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Repuesto" ADD COLUMN     "tipoEquipoId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "Repuesto_tipoEquipoId_idx" ON "Repuesto"("tipoEquipoId");

-- CreateIndex
CREATE INDEX "Repuesto_nombre_idx" ON "Repuesto"("nombre");

-- AddForeignKey
ALTER TABLE "Repuesto" ADD CONSTRAINT "Repuesto_tipoEquipoId_fkey" FOREIGN KEY ("tipoEquipoId") REFERENCES "TipoEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
