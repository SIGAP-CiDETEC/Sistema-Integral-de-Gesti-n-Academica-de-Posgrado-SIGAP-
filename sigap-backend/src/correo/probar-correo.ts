/**
 * Prueba la configuración de correo del .env enviando un mensaje:
 *   npm run probar-correo -- tu.correo@ipn.mx
 */
import 'dotenv/config';
import { correoConfigurado, enviarCorreo } from './correo';

async function main() {
  const para = process.argv[2];
  if (!para) throw new Error('Indica a quién enviar la prueba: npm run probar-correo -- tu.correo@ipn.mx');
  if (!correoConfigurado()) throw new Error('Faltan SMTP_HOST, SMTP_USUARIO o SMTP_CONTRASENA en el .env');
  console.log(`Enviando prueba a ${para} por ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587} como ${process.env.SMTP_USUARIO}…`);
  await enviarCorreo({ para, asunto: 'Prueba de correo de SIGAP', texto: 'Si recibiste este mensaje, SIGAP ya puede enviar correos.' });
  console.log('Listo: revisa la bandeja de entrada (y la de correo no deseado).');
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error(`No se pudo enviar: ${m}`);
  if (/535|auth/i.test(m)) console.error('La cuenta o la contraseña no se aceptaron. En Microsoft 365, TI debe activar "SMTP AUTH" para esa cuenta; en Gmail, usa una contraseña de aplicación.');
  process.exit(1);
});
