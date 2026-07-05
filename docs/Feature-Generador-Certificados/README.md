# Generador de Certificados — Fotosíntesis Admin (paquete de feature)

Todo lo necesario para entender, revisar e implementar el **Generador de Certificados** de tierramadre.app.

## Contenido

```
Feature-Generador-Certificados/
├── README.md                     ← este archivo
├── SPEC.md                       ← especificación de implementación (React + Convex)
├── mockup/
│   ├── generador-certificados.html   ← maqueta interactiva (ábrela en el navegador)
│   └── assets/                        ← arte de fondo + 8 fotos de gemas (usados por la maqueta)
├── disenos-fuente/               ← PDFs originales del equipo de diseño (fuente del arte)
│   ├── Certificado Origen Subasta 010526.pdf   (incluye las 8 piezas y sus datos exactos)
│   └── Certificado TM LUIS ALFONSO V2.pdf       (Embajador Semilla)
└── previews/                     ← imágenes renderizadas de referencia para la spec
    ├── montaje-tres-certificados.png
    ├── origen-corazon-de-la-noche.png
    ├── origen-soberania-imperial.png
    └── embajador-luis-alfonso.png
```

## Cómo usar

1. **Ver la maqueta:** abre `mockup/generador-certificados.html` en el navegador. Pestañas por tipo, autocompletar, vista previa en vivo y exportación (Imprimir/PDF + PNG). Mantén la carpeta `mockup/assets/` junto al HTML.
2. **Implementar:** sigue `SPEC.md` — arquitectura, sistema de plantillas con coordenadas exactas, mapeo de datos, criterios de aceptación.
3. **Arte:** los fondos en `mockup/assets/` se renderizaron desde los PDFs en `disenos-fuente/`. Para regenerarlos en mayor resolución, usa el "asset pipeline" descrito en `SPEC.md` (§6.6).

## Estado

- ✅ **Certificación de Origen** y ✅ **Certificado Embajador** — arte exacto + campos editables, listos.
- ⏳ **Carnet TM 2026** — falta el PDF fuente (`CARNET TM ALVARO PELAEZ.pdf`); la maqueta usa una versión aproximada hasta tenerlo.
