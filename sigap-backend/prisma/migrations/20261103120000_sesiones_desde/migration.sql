-- Al restablecer la contraseña (o desactivar la cuenta) se invalidan las sesiones abiertas antes de esa fecha
ALTER TABLE "Usuario" ADD COLUMN "sesionesDesde" TIMESTAMP(3);
