-- Avance del proceso que registra Posgrado y almacén de datos compartidos (módulo completo de Posgrado)
ALTER TABLE "Postulacion" ADD COLUMN "estadoProceso" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "Almacen" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "actualizadoPor" TEXT,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Almacen_pkey" PRIMARY KEY ("clave")
);
