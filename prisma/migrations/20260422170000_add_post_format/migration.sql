-- CreateEnum
CREATE TYPE "PostFormat" AS ENUM ('BLOG', 'LINKEDIN');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "format" "PostFormat" NOT NULL DEFAULT 'LINKEDIN';
ALTER TABLE "Post" ADD COLUMN "charCount" INTEGER;
