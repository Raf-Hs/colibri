-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "autorId" INTEGER NOT NULL,
    "destinoId" INTEGER NOT NULL,
    "viajeId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_destinoId_fkey" FOREIGN KEY ("destinoId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_viajeId_fkey" FOREIGN KEY ("viajeId") REFERENCES "Historial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
