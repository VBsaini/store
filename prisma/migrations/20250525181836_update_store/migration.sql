/*
  Warnings:

  - Made the column `country` on table `store` required. This step will fail if there are existing NULL values in that column.
  - Made the column `state` on table `store` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "store" ALTER COLUMN "country" SET NOT NULL,
ALTER COLUMN "state" SET NOT NULL;
