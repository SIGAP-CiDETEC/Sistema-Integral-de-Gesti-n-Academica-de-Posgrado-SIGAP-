import { createTransport, type Transporter } from 'nodemailer';

/**
 * Envío de correo por SMTP (Microsoft 365 / Outlook del IPN, Gmail u otro). Se configura en el .env del servidor:
 *
 *   SMTP_HOST=smtp.office365.com        (Gmail: smtp.gmail.com)
 *   SMTP_PORT=587
 *   SMTP_USUARIO=cuenta@ipn.mx          la cuenta con la que se inicia sesión en el correo
 *   SMTP_CONTRASENA=...                 (Gmail: "contraseña de aplicación" de 16 letras)
 *   SMTP_REMITENTE="SIGAP CIDETEC <cuenta@ipn.mx>"   opcional; por omisión, SMTP_USUARIO
 *   SIGAP_URL=https://virtual.cidetec.ipn.mx          para armar los enlaces de los correos
 *
 * Sin SMTP_HOST el sistema funciona igual, solo que no envía correos.
 */
let transporte: Transporter | null = null;

export const correoConfigurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USUARIO && process.env.SMTP_CONTRASENA);

export const urlSigap = () => (process.env.SIGAP_URL ?? 'https://virtual.cidetec.ipn.mx').replace(/\/$/, '');

function obtener() {
  if (!correoConfigurado()) throw new Error('El envío de correo no está configurado (faltan SMTP_HOST, SMTP_USUARIO o SMTP_CONTRASENA en el .env)');
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT ?? 587);
    transporte = createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465, // 587 usa STARTTLS
      requireTLS: puerto !== 465 && puerto !== 25,
      auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CONTRASENA },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }
  return transporte;
}

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Envía un correo con texto plano y una versión HTML sencilla (mismo contenido). `boton` agrega un enlace destacado.
 * Los párrafos se separan con una línea en blanco.
 */
export async function enviarCorreo(d: { para: string; asunto: string; texto: string; boton?: { texto: string; url: string } }) {
  const parrafos = d.texto.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${escapar(p).replace(/\n/g, '<br>')}</p>`);
  const boton = d.boton
    ? `<p style="margin:22px 0"><a href="${escapar(d.boton.url)}" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapar(d.boton.texto)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#6b7280">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapar(d.boton.url)}</p>`
    : '';
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111827;max-width:560px">
<p style="margin:0 0 18px;font-weight:600;color:#6b1d3a">SIGAP · CIDETEC-IPN</p>${parrafos.join('')}${boton}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Este correo lo envió automáticamente el Sistema Integral de Gestión Académica de Posgrado. No respondas a este mensaje.</p></div>`;
  const texto = d.boton ? `${d.texto}\n\n${d.boton.texto}: ${d.boton.url}` : d.texto;
  await obtener().sendMail({ from: process.env.SMTP_REMITENTE || process.env.SMTP_USUARIO, to: d.para, subject: d.asunto, text: texto, html });
}

/** Correo real de una cuenta (las cuentas sin correo usan uno interno que termina en sigap.local). */
export const correoReal = (correo?: string | null) => (correo && !/sigap\.local$/i.test(correo) && !/@pendiente\./i.test(correo) ? correo : null);
