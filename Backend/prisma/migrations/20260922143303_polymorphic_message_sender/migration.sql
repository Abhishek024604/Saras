/*
  Warnings:

  - You are about to drop the column `status` on the `AgentDefinition` table. All the data in the column will be lost.
  - You are about to drop the column `enabledAt` on the `ProjectAgent` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ProjectAgent` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'AGENT');

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropIndex
DROP INDEX "Message_senderId_idx";

-- DropIndex
DROP INDEX "ProjectAgent_status_idx";

-- AlterTable
ALTER TABLE "AgentDefinition" DROP COLUMN "status";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "senderType" "SenderType" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "ProjectAgent" DROP COLUMN "enabledAt",
DROP COLUMN "status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "AgentDefinitionStatus";

-- DropEnum
DROP TYPE "ProjectAgentStatus";

-- CreateIndex
CREATE INDEX "Message_senderId_senderType_idx" ON "Message"("senderId", "senderType");
