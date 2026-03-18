-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "processingError" TEXT,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3);
