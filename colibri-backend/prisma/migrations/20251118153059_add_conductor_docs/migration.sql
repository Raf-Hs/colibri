-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "acreditacionTaxi" TEXT,
ADD COLUMN     "domicilio" TEXT,
ADD COLUMN     "fotoConductor" TEXT,
ADD COLUMN     "licencia" TEXT,
ADD COLUMN     "poliza" TEXT,
ADD COLUMN     "vehiculoFotos" TEXT[] DEFAULT ARRAY[]::TEXT[];
