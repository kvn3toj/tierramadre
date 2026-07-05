# 05 · Meta Business Manager — WhatsApp + canales

> **✋ 100% manual tuyo** (login con tus cuentas + aprobación de Meta). Yo ya te dejé **los textos
> listos** en `../output/whatsapp-templates.md` (40 plantillas) y `.csv`. Aquí: cómo registrarlas y
> conectar los canales.

## A. WhatsApp Business API
1. Necesitas: cuenta de **Meta Business Manager** + un **número** verificado para WhatsApp Business API
   (no un WhatsApp personal). Puede ir vía Meta directo o vía el proveedor de GHL (LC Phone).
2. Conectar ese número a GHL (Settings → WhatsApp) para que el bot María responda ahí.

## B. Registrar las plantillas (Meta → WhatsApp Manager → Message Templates)
> WhatsApp exige plantillas pre-aprobadas para iniciar conversación / enviar fuera de la ventana de 24h.
Por cada plantilla de `output/whatsapp-templates.md`:
1. Create Template → Categoría correcta (**MARKETING** / **UTILITY**) · Idioma **Español (Colombia) es_CO**.
2. Name (snake_case, único, ej. `saludo_inicial_wa`) · pega el Body exacto · en Sample Variables pon
   ejemplos reales · configura botones si la plantilla los lleva · Submit.
3. Aprobación de Meta: **24-48h**. Las MARKETING se rechazan más (requieren opt-in) — empieza por las de
   **alta prioridad** (lista en el .md): WA-01, IG-01, CK-01, CK-03, ES-01, PV-02, PV-03.

## C. Conectar Instagram / Facebook / TikTok
1. **Facebook + Instagram**: Meta Business → conecta la Página de FB y la cuenta IG Business; luego en
   GHL → Settings → Integrations autoriza (OAuth) para que los DMs entren al inbox.
2. **TikTok**: GHL → Integrations → TikTok (si tu plan lo soporta).

## D. Notas
- Sin plantillas aprobadas, el bot NO puede iniciar conversación por WhatsApp (solo responder dentro de
  la ventana de 24h). Por eso conviene mandar las plantillas a aprobación **cuanto antes** (tardan).
- El costo de plantillas/conversaciones WhatsApp lo cobra Meta según su tarifa.

## Lo que yo aporté
- Los 40 textos listos para copiar/pegar (`output/whatsapp-templates.md` + `.csv` con categoría/prioridad).
- Recomendación de orden de registro (alta/media/baja) para que arranques con lo esencial.
