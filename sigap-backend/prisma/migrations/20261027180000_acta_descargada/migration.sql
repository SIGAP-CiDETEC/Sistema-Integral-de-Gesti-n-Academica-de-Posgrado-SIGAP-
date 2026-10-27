-- El acta MTC-EC queda cerrada (sin correcciones) desde que se descarga para firmarse
ALTER TABLE "ActaEntrevista" ADD COLUMN "descargadaEn" TIMESTAMP(3);
ALTER TABLE "ActaEntrevista" ADD COLUMN "descargadaPorId" TEXT;
