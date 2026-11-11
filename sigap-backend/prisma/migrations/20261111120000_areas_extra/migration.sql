-- Áreas adicionales de una cuenta (p. ej. una profesora que también es responsable de la Subdirección Académica).
-- El Administrador las agrega o las quita sin tocar el área principal de la cuenta.
ALTER TABLE "Usuario" ADD COLUMN "areasExtra" "AreaPersonal"[] NOT NULL DEFAULT ARRAY[]::"AreaPersonal"[];
