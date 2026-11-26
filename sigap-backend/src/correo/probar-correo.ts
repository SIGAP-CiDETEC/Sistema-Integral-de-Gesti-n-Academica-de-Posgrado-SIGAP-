/**
 * Prueba la configuración Mailjet del .env enviando un mensaje:
 *   npm run probar-correo -- tu.correo@ipn.mx
 */
import 'dotenv/config';
import { correoConfigurado, enviarCorreo } from './correo';

async function main() {
  const para = process.argv[2];
  if (!para) throw new Error('Indica a quién enviar la prueba: npm run probar-correo -- tu@ipn.mx');
  if (!correoConfigurado()) throw new Error('Faltan MAILJET_API_KEY, MAILJET_API_SECRET o MAILJET_SENDER_EMAIL en el .env');
  console.log(`Enviando correo de prueba a ${para} mediante Mailjet…`);
  await enviarCorreo({ para, asunto: 'Prueba de correo de SIGAP', texto: 'Si recibiste este mensaje, SIGAP ya puede enviar correos.' });
  console.log('Listo: revisa la bandeja de entrada (y la de correo no deseado).');
}

main().catch((e) => {
  const m = e instanceof Error ? e.message : String(e);
  console.error(`No se pudo enviar: ${m}`);
  process.exit(1);
});
