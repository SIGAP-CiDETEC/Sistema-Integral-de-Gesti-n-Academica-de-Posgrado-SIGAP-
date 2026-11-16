-- Portal del aspirante: registro en línea, verificación de datos y notificaciones vistas
ALTER TABLE "Postulacion" ADD COLUMN IF NOT EXISTS "expediente" JSONB NOT NULL DEFAULT '{}';
