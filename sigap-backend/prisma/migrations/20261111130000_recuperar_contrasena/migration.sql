-- Enlaces de un solo uso para restablecer la contraseña por correo (se guarda solo el hash del enlace)
CREATE TABLE IF NOT EXISTS "TokenRecuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenRecuperacion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TokenRecuperacion_hashToken_key" ON "TokenRecuperacion"("hashToken");
CREATE INDEX IF NOT EXISTS "TokenRecuperacion_usuarioId_idx" ON "TokenRecuperacion"("usuarioId");
DO $$ BEGIN
  ALTER TABLE "TokenRecuperacion" ADD CONSTRAINT "TokenRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
