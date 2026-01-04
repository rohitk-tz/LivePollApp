-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('Draft', 'Active', 'Closed');

-- AlterTable
ALTER TABLE "polls" ADD COLUMN     "status" "PollStatus" NOT NULL DEFAULT 'Draft';
