/*
  Warnings:

  - Made the column `returnStatus` on table `ProductLock` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ProductLock" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "returnStatus" SET NOT NULL;
