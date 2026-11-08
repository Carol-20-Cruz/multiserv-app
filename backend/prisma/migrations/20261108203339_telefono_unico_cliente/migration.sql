-- DropIndex
DROP INDEX "Cliente_telefono_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_telefono_key" ON "Cliente"("telefono");

