CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'READY', 'FAILED');
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Video" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "VideoStatus" NOT NULL DEFAULT 'UPLOADING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Analysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "videoId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "analysisDataKey" TEXT,
  "processedVideoKey" TEXT,
  "editorState" JSONB NOT NULL DEFAULT '{"corrections":[],"slowMotionSegments":[]}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "error" TEXT,
  CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Video_storageKey_key" ON "Video"("storageKey");
CREATE INDEX "Video_userId_createdAt_idx" ON "Video"("userId", "createdAt");
CREATE UNIQUE INDEX "Analysis_analysisDataKey_key" ON "Analysis"("analysisDataKey");
CREATE UNIQUE INDEX "Analysis_processedVideoKey_key" ON "Analysis"("processedVideoKey");
CREATE INDEX "Analysis_videoId_createdAt_idx" ON "Analysis"("videoId", "createdAt");

ALTER TABLE "Video" ADD CONSTRAINT "Video_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
