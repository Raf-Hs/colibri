-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "estadoValidacion" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "identificacion" TEXT;
