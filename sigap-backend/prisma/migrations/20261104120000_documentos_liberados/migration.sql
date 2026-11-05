-- Posgrado puede liberar a los profesores entrevistadores (mínimo 2) los documentos del aspirante antes de publicar la cita
ALTER TABLE "Entrevista" ADD COLUMN "documentosLiberadosEn" TIMESTAMP(3);
