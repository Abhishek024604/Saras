-- AlterTable
ALTER TABLE "ProjectDoc" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "ProjectDocSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDocSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDocSection_projectId_idx" ON "ProjectDocSection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDocSection_projectId_name_key" ON "ProjectDocSection"("projectId", "name");

-- CreateIndex
CREATE INDEX "ProjectDoc_sectionId_idx" ON "ProjectDoc"("sectionId");

-- AddForeignKey
ALTER TABLE "ProjectDocSection" ADD CONSTRAINT "ProjectDocSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocSection" ADD CONSTRAINT "ProjectDocSection_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDoc" ADD CONSTRAINT "ProjectDoc_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ProjectDocSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
