/**
 * Envío de correo transaccional SIGAP mediante Mailjet API v3.1.
 * Configuración por variables de entorno; nunca se almacenan claves en el código.
 */
const correoConfigurado = () => !!(
  process.env.MAILJET_API_KEY &&
  process.env.MAILJET_API_SECRET &&
  process.env.MAILJET_SENDER_EMAIL
);

export { correoConfigurado };

export const urlSigap = () => (process.env.SIGAP_URL ?? 'https://virtual.cidetec.ipn.mx').replace(/\/$/, '');

const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Envía un correo con texto plano y una versión HTML sencilla (mismo contenido). `boton` agrega un enlace destacado.
 * Los párrafos se separan con una línea en blanco.
 */
export async function enviarCorreo(d: { para: string; asunto: string; texto: string; boton?: { texto: string; url: string } }) {
  if (!correoConfigurado()) throw new Error('El envío de correo no está configurado (faltan MAILJET_API_KEY, MAILJET_API_SECRET o MAILJET_SENDER_EMAIL en el .env)');

  const parrafos = d.texto.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${escapar(p).replace(/\n/g, '<br>')}</p>`);
  const boton = d.boton
    ? `<p style="margin:22px 0"><a href="${escapar(d.boton.url)}" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapar(d.boton.texto)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#6b7280">Si el botón no funciona, copia este enlace en tu navegador:<br>${escapar(d.boton.url)}</p>`
    : '';
  const html = `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#111827;max-width:560px">
<p style="margin:0 0 18px;font-weight:600;color:#6b1d3a">SIGAP · CIDETEC-IPN</p>${parrafos.join('')}${boton}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Este correo lo envió automáticamente el Sistema Integral de Gestión Académica de Posgrado. No respondas a este mensaje.</p></div>`;
  const texto = d.boton ? `${d.texto}\n\n${d.boton.texto}: ${d.boton.url}` : d.texto;
  const nombre = process.env.MAILJET_SENDER_NAME || 'SIGAP · CIDETEC-IPN';
  const payload = {
    Messages: [{
      From: { Email: process.env.MAILJET_SENDER_EMAIL, Name: nombre },
      To: [{ Email: d.para }],
      Subject: d.asunto,
      TextPart: texto,
      HTMLPart: html,
    }],
  };
  const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_API_SECRET}`).toString('base64');
  const respuesta = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Mailjet rechazó el envío (HTTP ${respuesta.status}): ${detalle.slice(0, 500)}`);
  }
}

/** Correo real de una cuenta (las cuentas sin correo usan uno interno que termina en sigap.local). */
export const correoReal = (correo?: string | null) => (correo && !/sigap\.local$/i.test(correo) && !/@pendiente\./i.test(correo) ? correo : null);
