/*
  Warnings:

  - Added the required column `status` to the `TestcaseResult` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TestcaseResult" ADD COLUMN     "status" TEXT NOT NULL;
