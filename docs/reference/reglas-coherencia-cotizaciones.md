# Reglas de Coherencia para Cotizaciones de Esmeraldas

> **Documento de Referencia** - Tierra Madre Studio
> Última actualización: Enero 2026

Este documento define las reglas de validación para mantener coherencia entre precio, calidad y color en las cotizaciones de esmeraldas colombianas.

**Nota:** Todos los precios están basados en `precioCOP` (precio de venta al público), no en el costo interno TM.

---

## 1. Jerarquía de Calidad

Las calidades están ordenadas de mayor a menor valor, con sus multiplicadores de precio relativos:

| Nivel | Calidad | Multiplicador de Precio |
|:-----:|---------|:-----------------------:|
| 1 | **Fina** | 10x - 15x |
| 2 | **Comercial SuperFina** | 4x - 6x |
| 3 | **Comercial Superior** | 2x - 3x |
| 4 | **Comercial Fina** | 1.5x - 2x |
| 5 | **Comercial Estandar** | 1x - 1.5x |
| 6 | **Comercial** | 0.8x - 1x |
| 7 | **Estandar** | 0.5x - 0.8x |

### Evidencia del Inventario (Precio de Venta - precioCOP)

| Item | Calidad + Color | Precio COP | Peso | Precio/ct |
|------|-----------------|------------|------|-----------|
| 47 - Corazón Tierra Madre | Fina + Verde Muzo | $22,080,000 | 1.85ct | **~$11.9M/ct** |
| 46 - Amor Platónico | Comercial SuperFina + Verde Vivido | $7,653,334 | 2.63ct | **~$2.9M/ct** |
| 45 - Diosa Tierra Madre | Comercial SuperFina + Verde Vivido | $4,256,000 | 1.30ct | **~$3.3M/ct** |
| 67 - Hercules | Comercial SuperFina + Verde Limón | $355,290 | 0.70ct | **~$507K/ct** |
| 70 - Apolo | Comercial Superior + Verde Limón | $387,000 | 1.29ct | **~$300K/ct** |
| 74 - Fuego | Comercial Estandar + Verde Limón | $200,000 | 0.66ct | **~$303K/ct** |
| 10 - Jazmin | Estandar + Verde Menta | $285,600 | 0.99ct | **~$288K/ct** |

---

## 2. Jerarquía de Color

Los colores están ordenados de mayor a menor valor de mercado:

| Nivel | Color | Factor Premium | Descripción |
|:-----:|-------|:--------------:|-------------|
| 1 | **Verde Muzo** | +100% a +200% | El más codiciado, origen Muzo |
| 2 | **Verde Vivido** | +50% a +100% | Saturación intensa, muy deseable |
| 3 | **Verde Natural** | Base (1x) | Color de referencia |
| 4 | **Verde Limón** | -10% a -20% | Tono más claro, comercial |
| 5 | **Verde Menta** | -20% a -40% | Tono suave, más accesible |

### Observaciones del Inventario

- **Verde Muzo** con calidad Fina: ~$11.9M/ct (el más alto)
- **Verde Vivido** con Comercial SuperFina: ~$2.9M - $3.3M/ct
- **Verde Limón** con Comercial SuperFina: ~$500K/ct (mucho menor que Verde Vivido)
- **Verde Menta** generalmente se usa en joyería de plata con precios más accesibles

---

## 3. Reglas de Validación

### Regla 1: Precio Mínimo por Calidad (Precio de Venta/ct)

Establece el piso de precio de venta por quilate según la calidad:

| Calidad | Precio Mínimo/ct |
|---------|:----------------:|
| Fina | $8,000,000 COP |
| Comercial SuperFina | $400,000 COP |
| Comercial Superior | $250,000 COP |
| Comercial Fina | $150,000 COP |
| Comercial Estandar | $100,000 COP |
| Comercial | $80,000 COP |
| Estandar | $200,000 COP |

### Regla 2: Precio Máximo por Calidad (Precio de Venta/ct)

Previene sobre-valoración de calidades inferiores:

| Calidad | Precio Máximo/ct |
|---------|:----------------:|
| Estandar | $400,000 COP |
| Comercial Estandar | $500,000 COP |
| Comercial | $400,000 COP |
| Comercial Fina | $800,000 COP |
| Comercial Superior | $1,500,000 COP |
| Comercial SuperFina | $5,000,000 COP |

### Regla 3: Compatibilidad Color-Calidad

Ciertas combinaciones de color y calidad son inválidas o inusuales:

**Restricciones:**
- `Verde Muzo` solo puede tener calidad `Fina` o `Comercial SuperFina`
- `Verde Vivido` no puede tener calidad `Estandar`
- Calidad `Fina` solo aplica a colores `Verde Muzo` o `Verde Vivido`

**Combinaciones Inválidas:**
| Color | Calidades NO Permitidas |
|-------|------------------------|
| Verde Muzo | Comercial Superior, Comercial Fina, Comercial Estandar, Comercial, Estandar |
| Verde Vivido | Estandar |
| Verde Menta | Fina |

### Regla 4: Ajuste de Precio por Color

El precio base se multiplica según el factor de color:

```
precio_ajustado = precio_base × factor_color
```

| Color | Factor |
|-------|:------:|
| Verde Muzo | 2.0 |
| Verde Vivido | 1.5 |
| Verde Natural | 1.0 |
| Verde Limón | 0.85 |
| Verde Menta | 0.70 |

**Ejemplo del inventario:**
- Comercial SuperFina + Verde Vivido: ~$3M/ct
- Comercial SuperFina + Verde Limón: ~$500K/ct
- Ratio: 6x (el color Verde Vivido multiplica significativamente el valor)

### Regla 5: Progresión Peso-Precio

El precio por quilate aumenta con el peso para piedras de alta calidad:

| Peso | Calidad Requerida | Multiplicador |
|------|-------------------|:-------------:|
| > 2ct | Fina | 1.5x |
| > 3ct | Fina | 2.0x |
| > 2ct | Comercial SuperFina | 1.3x |
| > 3ct | Comercial SuperFina | 1.5x |

> **Nota:** Piedras más grandes de alta calidad son exponencialmente más valiosas debido a su rareza.

### Regla 6: Consistencia de Metal en Joyería

Para productos de joyería (anillos, collares, pendientes, pulseras):

| Tipo de Metal | Rango de Precio Total |
|---------------|----------------------|
| Oro 18k | $2,500,000 - $5,000,000 COP |
| Plata | $200,000 - $600,000 COP |

**Evidencia del inventario:**
- Anillos Oro 18k (Fina + Verde Muzo): $2,666,666 - $2,857,143 COP
- Anillos Plata (Comercial): $239,437 - $497,778 COP

---

## 4. Matriz de Rangos de Precio (Precio de Venta)

Rangos sugeridos en COP por quilate según combinación calidad/color:

| Calidad \ Color | Verde Muzo | Verde Vivido | Verde Natural | Verde Limón | Verde Menta |
|-----------------|:----------:|:------------:|:-------------:|:-----------:|:-----------:|
| **Fina** | 10-25M | 8-15M | - | - | - |
| **Comercial SuperFina** | 4-8M | 2.5-5M | 1-2M | 400K-800K | 300K-600K |
| **Comercial Superior** | - | 800K-1.5M | 400K-800K | 250-500K | 200-400K |
| **Comercial Fina** | - | 400K-800K | 250-500K | 150-350K | 120-300K |
| **Comercial Estandar** | - | - | 200-400K | 150-300K | 100-250K |
| **Estandar** | - | - | 200-350K | 180-320K | 150-300K |

> **Leyenda:** M = Millones COP, K = Miles COP
> **"-"** = Combinación no válida o muy inusual

---

## 5. Tipos de Validación

### Bloqueos Duros

Estas validaciones **impiden el envío** del formulario:

| Condición | Mensaje de Error |
|-----------|------------------|
| Calidad Fina con precio < $5,000,000/ct | "El precio es demasiado bajo para calidad Fina" |
| Verde Muzo con calidad inferior a Comercial SuperFina | "Verde Muzo requiere calidad Fina o Comercial SuperFina" |
| Calidad Estandar con precio > $500,000/ct | "El precio excede el máximo para calidad Estandar" |
| Precio = $0 | "El precio es requerido" |
| Peso = 0ct | "El peso es requerido" |

### Advertencias Suaves

Estas validaciones **permiten el envío** pero muestran una advertencia:

| Condición | Mensaje de Advertencia |
|-----------|------------------------|
| Precio 25% por debajo del rango sugerido | "El precio está por debajo del rango típico para esta calidad/color" |
| Precio 40% por encima del rango sugerido | "El precio está por encima del rango típico para esta calidad/color" |
| Combinación inusual (ej: Verde Menta + Comercial SuperFina) | "Esta combinación de color y calidad es poco común" |
| Peso > 3ct sin calidad premium | "Piedras de este tamaño suelen tener calidad superior" |

---

## 6. Aplicación por Formulario

### ProductRequestForm (Solicitudes de Asesores)

**Validaciones a implementar:**
- Verificar que el rango de presupuesto sea coherente con la calidad/color solicitados
- Advertir si el presupuesto máximo es muy bajo para la calidad deseada
- Sugerir ajustar expectativas de calidad si el presupuesto es limitado

**Ejemplo:**
```
SI presupuesto_max < $1,000,000 Y calidad = "Fina"
ENTONCES advertencia: "Para calidad Fina, el presupuesto típico es > $8,000,000/ct"
```

### ProviderQuotationForm (Cotizaciones de Proveedores)

**Validaciones a implementar:**
- Validar precio real contra la combinación calidad/color
- Bloquear combinaciones inválidas
- Calcular y mostrar precio por quilate automáticamente
- Mostrar rango sugerido según la selección

### QuotationPreview (Vista Previa de Cotización)

**Validaciones a implementar:**
- Mostrar indicador visual si el precio está fuera de rango
- Alertar sobre márgenes inusuales
- Validar coherencia del precio final con los costos de inversión

---

## 7. Fórmulas de Cálculo

### Precio por Quilate
```
precio_por_quilate = precio_total / peso_en_quilates
```

### Precio Sugerido
```
precio_sugerido = precio_base_calidad × factor_color × multiplicador_peso
```

### Validación de Rango
```
precio_minimo = rango_calidad.min × factor_color
precio_maximo = rango_calidad.max × factor_color

es_valido = precio_por_quilate >= precio_minimo
         && precio_por_quilate <= precio_maximo
```

### Porcentaje de Desviación
```
desviacion = ((precio_actual - precio_sugerido) / precio_sugerido) × 100

SI desviacion < -25% ENTONCES advertencia_precio_bajo
SI desviacion > +40% ENTONCES advertencia_precio_alto
```

---

## 8. Ejemplos de Validación

### Ejemplo 1: Cotización Válida
```
Producto: Esmeralda suelta
Peso: 2.63 ct
Color: Verde Vivido
Calidad: Comercial SuperFina
Precio: $7,653,334 COP

Cálculo:
- Precio/ct: $2,909,636
- Rango esperado: $2,500,000 - $5,000,000/ct (Verde Vivido + Comercial SuperFina)
- Resultado: ✅ VÁLIDO (dentro del rango)
```

### Ejemplo 2: Cotización Bloqueada
```
Producto: Esmeralda suelta
Peso: 2.0 ct
Color: Verde Muzo
Calidad: Comercial Fina
Precio: $1,000,000 COP

Validación:
- ERROR: Verde Muzo no puede tener calidad Comercial Fina
- BLOQUEO: Combinación color-calidad inválida
```

### Ejemplo 3: Cotización con Advertencia
```
Producto: Esmeralda suelta
Peso: 0.70 ct
Color: Verde Limón
Calidad: Comercial SuperFina
Precio: $200,000 COP

Cálculo:
- Precio/ct: $285,714
- Rango esperado: $400,000 - $800,000/ct
- Desviación: -29%
- Resultado: ⚠️ ADVERTENCIA (precio bajo para la calidad)
```

### Ejemplo 4: Joyería Válida
```
Producto: Anillo de Plata
Color: Verde Menta
Calidad: Comercial Superior
Precio Total: $272,000 COP

Validación:
- Rango Plata: $200,000 - $600,000 COP
- Resultado: ✅ VÁLIDO
```

---

## Apéndice: Constantes del Sistema

```typescript
// Factores de color
export const COLOR_FACTORS: Record<string, number> = {
  'Verde Muzo': 2.0,
  'Verde Vivido': 1.5,
  'Verde Natural': 1.0,
  'Verde Limón': 0.85,
  'Verde Menta': 0.70,
};

// Rangos base por calidad (COP/ct) - Precio de Venta
export const QUALITY_PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'Fina': { min: 8000000, max: 25000000 },
  'Comercial SuperFina': { min: 400000, max: 5000000 },
  'Comercial Superior': { min: 250000, max: 1500000 },
  'Comercial Fina': { min: 150000, max: 800000 },
  'Comercial Estandar': { min: 100000, max: 500000 },
  'Comercial': { min: 80000, max: 400000 },
  'Estandar': { min: 150000, max: 400000 },
};

// Rangos de precio para joyería por tipo de metal
export const JEWELRY_PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'Oro 18k': { min: 2500000, max: 5000000 },
  'Plata': { min: 200000, max: 600000 },
};

// Combinaciones válidas color-calidad
export const VALID_COLOR_QUALITY: Record<string, string[]> = {
  'Verde Muzo': ['Fina', 'Comercial SuperFina'],
  'Verde Vivido': ['Fina', 'Comercial SuperFina', 'Comercial Superior', 'Comercial Fina', 'Comercial Estandar', 'Comercial'],
  'Verde Natural': ['Comercial SuperFina', 'Comercial Superior', 'Comercial Fina', 'Comercial Estandar', 'Comercial', 'Estandar'],
  'Verde Limón': ['Comercial SuperFina', 'Comercial Superior', 'Comercial Fina', 'Comercial Estandar', 'Comercial', 'Estandar'],
  'Verde Menta': ['Comercial SuperFina', 'Comercial Superior', 'Comercial Fina', 'Comercial Estandar', 'Comercial', 'Estandar'],
};

// Multiplicadores por peso (para calidades premium)
export const WEIGHT_MULTIPLIERS: { minWeight: number; quality: string[]; multiplier: number }[] = [
  { minWeight: 2, quality: ['Fina'], multiplier: 1.5 },
  { minWeight: 3, quality: ['Fina'], multiplier: 2.0 },
  { minWeight: 2, quality: ['Comercial SuperFina'], multiplier: 1.3 },
  { minWeight: 3, quality: ['Comercial SuperFina'], multiplier: 1.5 },
];
```

---

## Resumen de Precios del Inventario Actual

### Piedras Sueltas (por precio/ct)

| Rango Precio/ct | Calidad Típica | Colores |
|-----------------|----------------|---------|
| > $10M | Fina | Verde Muzo |
| $2M - $5M | Comercial SuperFina | Verde Vivido |
| $400K - $800K | Comercial SuperFina | Verde Limón, Verde Natural |
| $250K - $400K | Comercial Superior/Fina | Verde Limón |
| $150K - $300K | Comercial Estandar | Verde Limón, Verde Menta |
| < $200K | Estandar | Verde Natural, Verde Menta |

### Joyería (precio total)

| Tipo | Rango Precio | Calidades Típicas |
|------|--------------|-------------------|
| Anillos Oro 18k | $2.6M - $2.9M | Fina (Verde Muzo) |
| Anillos Plata | $240K - $500K | Comercial Superior/Fina |

---

**Documento creado por:** Tierra Madre Studio
**Basado en:** Análisis del inventario Google Sheets - precioCOP (Enero 2026)
**Para implementación en:** ProductRequestForm, ProviderQuotationForm, QuotationPreview
