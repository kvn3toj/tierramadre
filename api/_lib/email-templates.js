/**
 * Email Templates for Tierra Madre Quotation System
 *
 * Branded HTML email templates for provider and admin notifications.
 * Uses Tierra Madre's emerald green color palette.
 */

// Brand Colors
const COLORS = {
  emerald: '#047857',       // Primary emerald green
  emeraldDark: '#065f46',   // Dark emerald
  emeraldLight: '#10b981',  // Light emerald accent
  gold: '#d4af37',          // Accent gold
  background: '#f8fafc',    // Light background
  text: '#1e293b',          // Dark text
  textLight: '#64748b',     // Light text
  white: '#ffffff',
  border: '#e2e8f0',
};

// Base template wrapper
const baseTemplate = (content, previewText = '') => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tierra Madre Studio</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 12px 24px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 28px; font-weight: bold; color: ${COLORS.emerald};">
                    💎 Tierra Madre
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-size: 12px; color: ${COLORS.textLight}; letter-spacing: 2px; padding-top: 4px;">
                    ESENCIA Y PODER
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.white}; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                <tr>
                  <td style="padding: 40px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 30px;">
              <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
                Este es un mensaje automático del sistema de cotizaciones de Tierra Madre.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: ${COLORS.textLight};">
                © ${new Date().getFullYear()} Tierra Madre Studio - Colombian Emeralds
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Helper: Create a styled button
const button = (text, url, primary = true) => `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
  <tr>
    <td align="center" style="border-radius: 8px; background-color: ${primary ? COLORS.emerald : COLORS.white}; border: 2px solid ${COLORS.emerald};">
      <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: ${primary ? COLORS.white : COLORS.emerald}; text-decoration: none;">
        ${text}
      </a>
    </td>
  </tr>
</table>
`;

// Helper: Info row
const infoRow = (label, value) => `
<tr>
  <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
    <span style="color: ${COLORS.textLight}; font-size: 13px;">${label}:</span>
    <span style="color: ${COLORS.text}; font-size: 14px; font-weight: 500; float: right;">${value}</span>
  </td>
</tr>
`;

// Helper: Detail box
const detailBox = (rows) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${COLORS.background}; border-radius: 8px; margin: 20px 0;">
  <tr>
    <td style="padding: 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${rows}
      </table>
    </td>
  </tr>
</table>
`;

// ============================================
// EMAIL TEMPLATES
// ============================================

/**
 * Template: New Quotation Request (Admin → Provider)
 * Sent when admin creates a new request for a provider
 */
export const newQuotationRequest = ({
  providerName,
  productType,
  weightMin,
  weightMax,
  colorPreference,
  qualityPreference,
  budgetMax,
  quantity,
  notes,
  requestId,
  appUrl
}) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${COLORS.text};">
      Nueva Solicitud de Cotización
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.textLight};">
      Hola ${providerName}, tienes una nueva solicitud de cotización.
    </p>

    ${detailBox(`
      ${infoRow('Tipo de Producto', productType || 'No especificado')}
      ${infoRow('Peso', `${weightMin || '?'} - ${weightMax || '?'} ct`)}
      ${infoRow('Color', colorPreference || 'Flexible')}
      ${infoRow('Calidad', qualityPreference || 'Flexible')}
      ${infoRow('Presupuesto Máx', budgetMax ? `$${Number(budgetMax).toLocaleString('es-CO')} COP` : 'Flexible')}
      ${infoRow('Cantidad', quantity || '1')}
    `)}

    ${notes ? `
    <div style="margin: 20px 0; padding: 16px; background-color: #fef9c3; border-radius: 8px; border-left: 4px solid ${COLORS.gold};">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Notas adicionales:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${notes}</p>
    </div>
    ` : ''}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${COLORS.text};">
      Por favor responde a esta solicitud con tu mejor oferta.
    </p>

    ${button('Responder Solicitud', `${appUrl}/provider/requests?respond=${requestId}`)}

    <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
      ID de Solicitud: ${requestId}
    </p>
  `;

  return {
    subject: '💎 Nueva Solicitud de Cotización - Tierra Madre',
    html: baseTemplate(content, `Tienes una nueva solicitud de cotización para ${productType}`),
  };
};

/**
 * Template: Provider Submitted Quotation (Provider → Admin)
 * Sent to admins when a provider submits a quotation
 */
export const providerSubmittedQuotation = ({
  adminName,
  providerName,
  providerEmail,
  productType,
  weightCarats,
  color,
  quality,
  priceCOP,
  description,
  quotationId,
  requestId,
  appUrl
}) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${COLORS.text};">
      Nueva Cotización Recibida
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.textLight};">
      ${adminName ? `Hola ${adminName}, ` : ''}${providerName} ha enviado una nueva cotización${requestId ? ' en respuesta a tu solicitud' : ''}.
    </p>

    <div style="margin-bottom: 20px; padding: 12px 16px; background-color: ${COLORS.emeraldLight}20; border-radius: 8px; border-left: 4px solid ${COLORS.emerald};">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Proveedor</p>
      <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: ${COLORS.emerald};">${providerName}</p>
      <p style="margin: 2px 0 0 0; font-size: 13px; color: ${COLORS.textLight};">${providerEmail}</p>
    </div>

    ${detailBox(`
      ${infoRow('Tipo', productType || 'Esmeralda')}
      ${infoRow('Peso', weightCarats ? `${weightCarats} ct` : 'No especificado')}
      ${infoRow('Color', color || 'No especificado')}
      ${infoRow('Calidad', quality || 'No especificado')}
      ${infoRow('Precio', priceCOP ? `$${Number(priceCOP).toLocaleString('es-CO')} COP` : 'Consultar')}
    `)}

    ${description ? `
    <div style="margin: 16px 0;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Descripción:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${description}</p>
    </div>
    ` : ''}

    ${button('Ver Cotización', `${appUrl}/cuentas/cotizaciones-proveedor?id=${quotationId}`)}

    <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
      ID de Cotización: ${quotationId}
      ${requestId ? `<br>En respuesta a solicitud: ${requestId}` : ''}
    </p>
  `;

  return {
    subject: `💎 Nueva Cotización de ${providerName} - Tierra Madre`,
    html: baseTemplate(content, `${providerName} ha enviado una cotización de ${productType}`),
  };
};

/**
 * Template: Quotation Status Changed (Admin → Provider)
 * Sent when admin changes quotation status (accepted/rejected/reserved/sold)
 */
export const quotationStatusChanged = ({
  providerName,
  quotationId,
  productType,
  oldStatus,
  newStatus,
  adminNotes,
  appUrl
}) => {
  const statusMessages = {
    reservado: {
      title: '🎉 ¡Tu cotización ha sido reservada!',
      message: 'El administrador ha reservado tu cotización. Esto significa que hay un cliente interesado.',
      color: '#f59e0b',
    },
    vendido: {
      title: '✨ ¡Cotización vendida!',
      message: '¡Felicitaciones! Tu producto ha sido vendido.',
      color: COLORS.emerald,
    },
    disponible: {
      title: 'Cotización disponible nuevamente',
      message: 'Tu cotización ha vuelto al estado disponible.',
      color: COLORS.emeraldLight,
    },
    rechazado: {
      title: 'Cotización no seleccionada',
      message: 'Lamentablemente, tu cotización no fue seleccionada en esta ocasión.',
      color: '#ef4444',
    },
  };

  const statusInfo = statusMessages[newStatus] || {
    title: 'Estado de cotización actualizado',
    message: `El estado de tu cotización ha cambiado a: ${newStatus}`,
    color: COLORS.textLight,
  };

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${statusInfo.color};">
        ${statusInfo.title}
      </h1>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.text}; text-align: center;">
      Hola ${providerName}, ${statusInfo.message}
    </p>

    ${detailBox(`
      ${infoRow('Producto', productType || 'Esmeralda')}
      ${infoRow('Estado Anterior', oldStatus)}
      ${infoRow('Nuevo Estado', newStatus.toUpperCase())}
    `)}

    ${adminNotes ? `
    <div style="margin: 20px 0; padding: 16px; background-color: ${COLORS.background}; border-radius: 8px;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Mensaje del administrador:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${adminNotes}</p>
    </div>
    ` : ''}

    ${button('Ver Mis Cotizaciones', `${appUrl}/provider/mis-cotizaciones`)}

    <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
      ID de Cotización: ${quotationId}
    </p>
  `;

  return {
    subject: `💎 ${statusInfo.title} - Tierra Madre`,
    html: baseTemplate(content, statusInfo.message),
  };
};

/**
 * Template: Quotation Request Cancelled (Admin → Provider)
 * Sent when admin cancels a quotation request
 */
export const quotationRequestCancelled = ({
  providerName,
  requestId,
  productType,
  reason,
  appUrl
}) => {
  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${COLORS.text};">
      Solicitud Cancelada
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.textLight};">
      Hola ${providerName}, la solicitud de cotización ha sido cancelada.
    </p>

    ${detailBox(`
      ${infoRow('Tipo de Producto', productType || 'No especificado')}
      ${infoRow('ID de Solicitud', requestId)}
      ${infoRow('Estado', 'CANCELADA')}
    `)}

    ${reason ? `
    <div style="margin: 20px 0; padding: 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Razón:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${reason}</p>
    </div>
    ` : ''}

    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${COLORS.text};">
      Puedes seguir revisando otras solicitudes activas en el sistema.
    </p>

    ${button('Ver Solicitudes', `${appUrl}/provider/requests`, false)}
  `;

  return {
    subject: '💎 Solicitud Cancelada - Tierra Madre',
    html: baseTemplate(content, 'Una solicitud de cotización ha sido cancelada'),
  };
};

/**
 * Template: Product Request Forwarded to Provider
 * Sent when admin forwards a product request to a provider
 */
export const productRequestForwarded = ({
  providerName,
  requesterName,
  requesterRole,
  productType,
  description,
  weightMin,
  weightMax,
  colorPreference,
  qualityPreference,
  budgetMin,
  budgetMax,
  quantity,
  clientName,
  priority,
  neededBy,
  notes,
  requestId,
  appUrl
}) => {
  const priorityColors = {
    alta: '#ef4444',
    media: '#f59e0b',
    baja: COLORS.emeraldLight,
  };

  const content = `
    <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${COLORS.text};">
      Solicitud de Producto
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.textLight};">
      Hola ${providerName}, un ${requesterRole || 'miembro del equipo'} ha solicitado un producto.
    </p>

    ${priority ? `
    <div style="display: inline-block; margin-bottom: 16px; padding: 4px 12px; background-color: ${priorityColors[priority] || COLORS.textLight}20; border-radius: 16px;">
      <span style="font-size: 12px; font-weight: 600; color: ${priorityColors[priority] || COLORS.textLight}; text-transform: uppercase;">
        Prioridad ${priority}
      </span>
    </div>
    ` : ''}

    ${detailBox(`
      ${infoRow('Solicitante', requesterName || 'No especificado')}
      ${infoRow('Tipo de Producto', productType || 'Esmeralda')}
      ${infoRow('Peso', `${weightMin || '?'} - ${weightMax || '?'} ct`)}
      ${infoRow('Color', colorPreference || 'Flexible')}
      ${infoRow('Calidad', qualityPreference || 'Flexible')}
      ${budgetMin || budgetMax ? infoRow('Presupuesto', `$${Number(budgetMin || 0).toLocaleString('es-CO')} - $${Number(budgetMax || 0).toLocaleString('es-CO')} COP`) : ''}
      ${infoRow('Cantidad', quantity || '1')}
      ${neededBy ? infoRow('Fecha Límite', new Date(neededBy).toLocaleDateString('es-CO')) : ''}
    `)}

    ${description ? `
    <div style="margin: 16px 0;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Descripción:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${description}</p>
    </div>
    ` : ''}

    ${clientName ? `
    <div style="margin: 16px 0; padding: 12px; background-color: ${COLORS.gold}15; border-radius: 8px;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Cliente Final:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: ${COLORS.text};">${clientName}</p>
    </div>
    ` : ''}

    ${notes ? `
    <div style="margin: 16px 0;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Notas adicionales:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${notes}</p>
    </div>
    ` : ''}

    ${button('Enviar Cotización', `${appUrl}/provider/quotation-form?productRequestId=${requestId}`)}

    <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
      ID de Solicitud: ${requestId}
    </p>
  `;

  return {
    subject: `💎 Solicitud de Producto${priority === 'alta' ? ' - URGENTE' : ''} - Tierra Madre`,
    html: baseTemplate(content, `Nueva solicitud de producto: ${productType}`),
  };
};

/**
 * Template: Product Request Status Update (Admin → Requester)
 * Sent to the team member when their product request is updated
 */
export const productRequestStatusUpdate = ({
  requesterName,
  requestId,
  productType,
  status,
  adminResponse,
  respondedBy,
  appUrl
}) => {
  const statusInfo = {
    aprobada: {
      title: '✅ Solicitud Aprobada',
      message: 'Tu solicitud de producto ha sido aprobada.',
      color: COLORS.emerald,
    },
    rechazada: {
      title: '❌ Solicitud No Aprobada',
      message: 'Lamentablemente, tu solicitud no fue aprobada.',
      color: '#ef4444',
    },
    enviada_proveedor: {
      title: '📤 Enviada a Proveedor',
      message: 'Tu solicitud ha sido enviada a nuestros proveedores.',
      color: '#3b82f6',
    },
    completada: {
      title: '🎉 Solicitud Completada',
      message: '¡Tu solicitud ha sido completada exitosamente!',
      color: COLORS.emerald,
    },
  };

  const info = statusInfo[status] || {
    title: 'Actualización de Solicitud',
    message: `El estado de tu solicitud ha cambiado a: ${status}`,
    color: COLORS.textLight,
  };

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="margin: 0 0 8px 0; font-size: 24px; color: ${info.color};">
        ${info.title}
      </h1>
    </div>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: ${COLORS.text}; text-align: center;">
      Hola ${requesterName}, ${info.message}
    </p>

    ${detailBox(`
      ${infoRow('Producto', productType || 'Esmeralda')}
      ${infoRow('Estado', status.toUpperCase().replace('_', ' '))}
      ${respondedBy ? infoRow('Respondido por', respondedBy) : ''}
    `)}

    ${adminResponse ? `
    <div style="margin: 20px 0; padding: 16px; background-color: ${COLORS.background}; border-radius: 8px;">
      <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight};">Respuesta del administrador:</p>
      <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.text};">${adminResponse}</p>
    </div>
    ` : ''}

    ${button('Ver Mis Solicitudes', `${appUrl}/mis-solicitudes`)}

    <p style="margin: 0; font-size: 12px; color: ${COLORS.textLight};">
      ID de Solicitud: ${requestId}
    </p>
  `;

  return {
    subject: `💎 ${info.title} - Tierra Madre`,
    html: baseTemplate(content, info.message),
  };
};

// Export all templates
export default {
  newQuotationRequest,
  providerSubmittedQuotation,
  quotationStatusChanged,
  quotationRequestCancelled,
  productRequestForwarded,
  productRequestStatusUpdate,
};
