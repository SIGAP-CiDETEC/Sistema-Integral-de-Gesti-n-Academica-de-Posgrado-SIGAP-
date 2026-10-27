-- Las entrevistas colegiadas duran normalmente 25 minutos
ALTER TABLE "Entrevista" ALTER COLUMN "duracionMin" SET DEFAULT 25;
-- Las entrevistas capturadas antes de poder elegir duración quedaron en 60 min por omisión: pasan a 25
UPDATE "Entrevista" SET "duracionMin" = 25 WHERE "duracionMin" = 60 AND "actualizadoEn" < '2026-10-27 15:00:00+00';
