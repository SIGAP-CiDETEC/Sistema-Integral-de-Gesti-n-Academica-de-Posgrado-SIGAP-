-- Duración de la entrevista colegiada (minutos); las existentes quedan en 60
ALTER TABLE "Entrevista" ADD COLUMN "duracionMin" INTEGER NOT NULL DEFAULT 60;
