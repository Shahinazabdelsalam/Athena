-- AlterEnum: extend PostFormat with CAROUSEL and THREAD
ALTER TYPE "PostFormat" ADD VALUE 'CAROUSEL';
ALTER TYPE "PostFormat" ADD VALUE 'THREAD';

-- AlterTable: Post — pillar + suffix arrays for hook variants and follow-up ideas
ALTER TABLE "Post" ADD COLUMN "pillar" TEXT;
ALTER TABLE "Post" ADD COLUMN "alternativeHooks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Post" ADD COLUMN "followUpIdeas" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable: BrandVoice (1:1 with User)
CREATE TABLE "BrandVoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "soul" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "toneRules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bannedWords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mandatoryAnchors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pillars" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandVoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrandVoice_userId_key" ON "BrandVoice"("userId");

-- AddForeignKey
ALTER TABLE "BrandVoice" ADD CONSTRAINT "BrandVoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
