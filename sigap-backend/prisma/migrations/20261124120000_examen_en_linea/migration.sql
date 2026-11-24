-- Examen de admisión en línea: banco de preguntas y exámenes de los aspirantes
CREATE TABLE "PreguntaExamen" (
    "id" TEXT NOT NULL,
    "area" "AreaEvaluacion" NOT NULL,
    "nivel" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "datos" JSONB NOT NULL,
    "actualizadoPor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PreguntaExamen_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PreguntaExamen_area_nivel_activa_idx" ON "PreguntaExamen"("area", "nivel", "activa");

CREATE TABLE "ExamenAspirante" (
    "id" TEXT NOT NULL,
    "postulacionId" TEXT NOT NULL,
    "area" "AreaEvaluacion" NOT NULL,
    "habilitadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "habilitadoPor" TEXT NOT NULL,
    "inicioEn" TIMESTAMP(3),
    "limiteEn" TIMESTAMP(3),
    "terminadoEn" TIMESTAMP(3),
    "preguntas" JSONB,
    "respuestas" JSONB NOT NULL DEFAULT '{}',
    "incidentes" JSONB NOT NULL DEFAULT '[]',
    "puntos" DOUBLE PRECISION,
    "puntosMax" DOUBLE PRECISION,
    "valorExamen" DOUBLE PRECISION,
    "calificacion" DOUBLE PRECISION,
    "calificacion10" DOUBLE PRECISION,
    "registradoEn" TIMESTAMP(3),
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExamenAspirante_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamenAspirante_postulacionId_area_key" ON "ExamenAspirante"("postulacionId", "area");
ALTER TABLE "ExamenAspirante" ADD CONSTRAINT "ExamenAspirante_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "Postulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
