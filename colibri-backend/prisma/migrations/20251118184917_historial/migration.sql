-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "rol" SET DEFAULT 'viajero';

-- CreateTable
CREATE TABLE "Historial" (
    "id" SERIAL NOT NULL,
    "pasajero" TEXT NOT NULL,
    "conductor" TEXT,
    "origen" JSONB NOT NULL,
    "destino" JSONB NOT NULL,
    "distancia" TEXT NOT NULL,
    "duracion" TEXT NOT NULL,
    "costo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origenTexto" TEXT,
    "destinoTexto" TEXT,

    CONSTRAINT "Historial_pkey" PRIMARY KEY ("id")
);
