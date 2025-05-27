/*
  Warnings:

  - You are about to drop the column `country` on the `store` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `store` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "store" DROP COLUMN "country",
DROP COLUMN "state";
