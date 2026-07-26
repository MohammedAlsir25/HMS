-- CreateTable
CREATE TABLE "clinical_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clinicType" "ClinicType" NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "hospitalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clinical_templates_clinicType_idx" ON "clinical_templates"("clinicType");

-- CreateIndex
CREATE INDEX "clinical_templates_hospitalId_idx" ON "clinical_templates"("hospitalId");

-- CreateIndex
CREATE INDEX "clinical_templates_createdById_idx" ON "clinical_templates"("createdById");

-- AddForeignKey
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_templates" ADD CONSTRAINT "clinical_templates_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
