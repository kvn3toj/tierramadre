# Manual de Subida de Imágenes - Tierra Madre Studio

## Guía para Subir Fotos de Inventario a Google Drive

Este documento explica cómo subir imágenes de esmeraldas al sistema de inventario de Tierra Madre.

---

## 1. Requisitos Previos

### Acceso Necesario
- Cuenta de Google con acceso a la carpeta compartida de Tierra Madre
- Imágenes en formato JPG, PNG o WebP
- Número de producto (Item Number) de cada esmeralda

### Carpeta de Google Drive
Solicita acceso a la carpeta compartida de inventario:
```
📁 Tierra Madre - Inventario de Imágenes
```

---

## 2. Convención de Nombres de Archivos

### Formato Recomendado
```
product-{NUMERO_ITEM}-{DESCRIPCION}.jpg
```

### Ejemplos
| Archivo | Descripción |
|---------|-------------|
| `product-101-frontal.jpg` | Vista frontal del producto 101 |
| `product-101-lateral.jpg` | Vista lateral del producto 101 |
| `product-102-macro.jpg` | Foto macro del producto 102 |
| `product-103-lifestyle.jpg` | Foto lifestyle del producto 103 |

### Sufijos Recomendados
- `-frontal` - Vista principal/frontal
- `-lateral` - Vista de costado
- `-macro` - Detalle cercano/macro
- `-trasera` - Vista posterior
- `-escala` - Con referencia de tamaño
- `-lifestyle` - En contexto/uso
- `-certificado` - Foto del certificado

---

## 3. Pasos para Subir Imágenes

### Paso 1: Preparar las Imágenes

1. **Verificar calidad** antes de subir:
   - Resolución mínima: **1200 x 1200 píxeles**
   - Tamaño ideal: **100KB - 3MB**
   - Formato: **JPG** (preferido) o PNG
   - Fondo: Limpio, preferiblemente blanco o neutro

2. **Renombrar archivos** siguiendo la convención:
   ```
   product-{NUMERO}-{descripcion}.jpg
   ```

### Paso 2: Acceder a Google Drive

1. Ir a [Google Drive](https://drive.google.com)
2. Navegar a la carpeta compartida **"Tierra Madre - Inventario"**
3. Abrir la subcarpeta del mes actual (si existe)

### Paso 3: Subir Archivos

**Opción A: Arrastrar y Soltar**
1. Seleccionar los archivos en tu computadora
2. Arrastrarlos directamente a la ventana de Drive

**Opción B: Botón de Subida**
1. Click en **"+ Nuevo"** (esquina superior izquierda)
2. Seleccionar **"Subir archivos"**
3. Elegir los archivos a subir

**Opción C: Desde Móvil**
1. Abrir la app de Google Drive
2. Tocar el botón **"+"**
3. Seleccionar **"Subir"**
4. Elegir fotos de la galería

### Paso 4: Verificar la Subida

Después de subir, verificar que:
- [ ] Los archivos aparecen en la carpeta correcta
- [ ] Los nombres siguen el formato `product-XXX-descripcion.jpg`
- [ ] Las imágenes se visualizan correctamente

---

## 4. Especificaciones de Calidad

### Requisitos Mínimos

| Aspecto | Mínimo | Ideal | Máximo |
|---------|--------|-------|--------|
| Ancho | 800px | 1200px+ | 4000px |
| Alto | 800px | 1200px+ | 4000px |
| Tamaño archivo | 100KB | 500KB-2MB | 5MB |
| Formato | JPG/PNG | JPG | WebP |

### Sistema de Calificación (Estrellas)

El sistema califica automáticamente cada imagen:

| Estrellas | Calificación | Significado |
|-----------|--------------|-------------|
| ⭐⭐⭐⭐⭐ | Excelente | Lista para catálogo profesional |
| ⭐⭐⭐⭐ | Muy Buena | Aceptable para uso general |
| ⭐⭐⭐ | Buena | Necesita revisión menor |
| ⭐⭐ | Regular | Considerar retomar |
| ⭐ | Pobre | No usar, retomar foto |

### Criterios de Evaluación

1. **Resolución (40 puntos)**
   - 1200px+: Excelente
   - 800-1199px: Bueno
   - 400-799px: Regular
   - <400px: Pobre

2. **Tamaño de Archivo (30 puntos)**
   - 100KB-3MB: Óptimo
   - <100KB: Muy pequeño (baja calidad)
   - >5MB: Muy grande (optimizar)

3. **Formato (15 puntos)**
   - JPG/WebP: Óptimo para web
   - PNG: Bueno (más pesado)
   - Otros: Convertir

4. **Proporción (15 puntos)**
   - 1:1 (cuadrado): Ideal para catálogos
   - 4:3 o 3:4: Aceptable
   - Muy alargado: Recortar

---

## 5. Tips para Mejores Fotos

### Iluminación
- Usar luz natural difusa o softbox
- Evitar sombras duras
- Mantener exposición consistente

### Composición
- Centrar la esmeralda en el encuadre
- Dejar margen alrededor (10-15%)
- Fondo neutro (blanco, gris claro, negro)

### Enfoque
- Usar trípode si es posible
- Enfocar en el centro de la piedra
- Usar apertura f/8-f/11 para nitidez

### Post-Proceso
- Ajustar balance de blancos
- No sobre-saturar los verdes
- Mantener aspecto natural

---

## 6. Sincronización con el Sistema

### Proceso Automático

Una vez subidas las imágenes a la carpeta correcta de Drive:

```
Carpetas de Productos Google Drive → API Proxy Drive → App Tierra Madre
              ↓                            ↓                  ↓
       products/{item}/            Auto-retry logic     Grilla de Productos
```

**Importante**: Las imágenes deben estar en carpetas nombradas `{item} - {nombre}/` (ej: `32 - Venus/`) para la detección automática.

### Verificar en la App

1. Abrir [Tierra Madre Studio](https://tierra-madre-studio.vercel.app)
2. Ir a la sección de **Inventario**
3. Buscar el producto por número
4. Verificar que la imagen aparece correctamente

### API de Verificación

Para verificar la calidad de una imagen específica:
```
/api/verify-image?itemNumber={NUMERO}
```

Ejemplo:
```
https://tierra-madre-studio.vercel.app/api/verify-image?itemNumber=101
```

---

## 7. Solución de Problemas

### La imagen no aparece en la app

1. Verificar que el nombre sigue el formato correcto
2. Esperar 5-10 minutos para sincronización
3. Limpiar caché del navegador
4. Contactar al administrador

### La calidad aparece como "Pobre"

1. Verificar resolución (mínimo 800px)
2. Verificar tamaño de archivo (mínimo 100KB)
3. Retomar la foto con mejor iluminación
4. Usar formato JPG en lugar de PNG comprimido

### Error al subir

1. Verificar conexión a internet
2. Verificar que tienes permisos en la carpeta
3. Intentar con archivos más pequeños
4. Contactar al administrador

---

## 8. Contacto y Soporte

Para problemas técnicos o acceso:
- **Email**: [soporte@tierramadre.com]
- **WhatsApp**: [+57 XXX XXX XXXX]

---

## Resumen Rápido

```
1. Preparar fotos (1200px+, JPG, <3MB)
2. Nombrar: product-{NUMERO}-{descripcion}.jpg
3. Subir a carpeta compartida de Drive
4. Verificar en la app
```

---

*Última actualización: Diciembre 2025*
*Versión: 1.0*
