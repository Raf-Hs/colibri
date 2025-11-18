/*
  Warnings:

  - Made the column `conductor` on table `Historial` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Historial" ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'finalizado',
ALTER COLUMN "conductor" SET NOT NULL;
