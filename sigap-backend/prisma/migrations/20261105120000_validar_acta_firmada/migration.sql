-- Posgrado valida el acta MTC-EC firmada que sube un profesor (que traiga las firmas de los 3) antes de aplicar el dictamen
ALTER TABLE "ActaEntrevista" ADD COLUMN "firmadaValidadaEn" TIMESTAMP(3);
ALTER TABLE "ActaEntrevista" ADD COLUMN "firmadaValidadaPor" TEXT;
ALTER TABLE "ActaEntrevista" ADD COLUMN "firmadaRechazos" JSONB NOT NULL DEFAULT '[]';
