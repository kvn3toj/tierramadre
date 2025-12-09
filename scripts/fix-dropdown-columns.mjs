/**
 * Script para limpiar y re-aplicar validaciones de dropdown
 * con los índices de columna CORRECTOS
 */
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SPREADSHEET_ID = '1mghR6aAtLzR0eE4T17yLQhknO9osCvJeRtxmgtl3iNU';

// Opciones de dropdown actualizadas
const DROPDOWN_OPTIONS = {
  color: [
    'Verde Natural', 'Verde Limón', 'Verde Oscuro', 'Verde Claro',
    'Verde Azulado', 'Verde Amarillento', 'Verde Intenso', 'Verde Medio',
    'Verde Bosque', 'Verde Esmeralda', 'Verde Menta', 'Verde Vivido',
    'Verde Brillante', 'Verde Profundo', 'Verde Selva', 'Verde Oliva',
    'Bluish Green', 'Yellowish Green', 'Natural', 'Plata'
  ],
  calidad: [
    'Comercial Estándar', 'Comercial Superior', 'Comercial Fina',
    'Comercial SuperFina', 'Fina', 'Esencial', 'Sublime',
    'Plata - comercial'
  ],
  talla: [
    'Esmeralda', 'Cuadrada', 'Redonda', 'Ovalada', 'Pera', 'Corazón', 'Marquesa', 'Cushion', 'Lágrima', 'Baguette',
    '5', '6', '7', '8', '9', '10', '11', '12', '13',
    'N/A', 'Otro'
  ],
  medidaS: ['Largo x Ancho', 'Diámetro'],
  ubicacion: ['ASESOR', 'BOVEDA OFI', 'BOVEDA', 'EN PROCESO', 'CLIENTE'],
  estado: ['DISPONIBLE', 'VENDIDA', 'Legalizada', 'Pte Legalizar', 'Pte legalizar 50%', 'RESERVADA'],
};

// ÍNDICES CORRECTOS basados en la estructura REAL de la hoja
// A(0)=vacía, B(1)=Item, C(2)=Fecha, D(3)=Nombre, E(4)=Peso, F(5)=Color, G(6)=Calidad
// H(7)=Cant, I(8)=Talla, J(9)=MedidaTipo, K(10)=MedidaValor, L(11)=Imagen
// M(12)=Costo, N(13)=PrecioCOP, O(14)=Ubicacion, P(15)=Asesor, Q(16)=Estado
const COLUMN_INDICES = {
  color: 5,      // F
  calidad: 6,    // G
  talla: 8,      // I
  medidaS: 9,    // J (Tipo de medida: Largo x Ancho / Diámetro)
  ubicacion: 14, // O
  estado: 16,    // Q
};

async function fixDropdownColumns() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
    process.exit(1);
  }

  const credentials = JSON.parse(Buffer.from(key, 'base64').toString());
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Obtener información del sheet
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const inventorySheet = metadata.data.sheets.find(s =>
    s.properties.title.toLowerCase().includes('inventario')
  );

  if (!inventorySheet) {
    console.error('No se encontró la hoja de inventario');
    process.exit(1);
  }

  const sheetId = inventorySheet.properties.sheetId;
  const sheetName = inventorySheet.properties.title;
  console.log(`Sheet encontrado: "${sheetName}" (ID: ${sheetId})`);

  // Obtener número de filas
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${sheetName}'!A:A`,
  });
  const rowCount = dataResponse.data.values?.length || 100;
  console.log(`Filas en el sheet: ${rowCount}`);

  // PASO 1: Limpiar TODAS las validaciones de datos existentes en las columnas problemáticas
  console.log('\n=== PASO 1: Limpiando validaciones existentes ===');

  const clearRequests = [];

  // Limpiar columnas de dropdowns (todas las que podrían tener validaciones incorrectas)
  // IMPORTANTE: Incluir columna E (4) que tenía validación incorrecta de Color
  const columnsToClear = [4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17]; // E, F, G, H, I, J, K, N, O, P, Q, R

  for (const colIdx of columnsToClear) {
    clearRequests.push({
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: 1,
          endRowIndex: rowCount + 200,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        rule: null, // null = eliminar validación
      },
    });
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: clearRequests },
  });
  console.log(`Validaciones limpiadas en ${columnsToClear.length} columnas`);

  // PASO 2: Aplicar las validaciones correctas
  console.log('\n=== PASO 2: Aplicando validaciones correctas ===');

  const validationRequests = [];

  // Color (F = índice 5)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.color,
        endColumnIndex: COLUMN_INDICES.color + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.color.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ Color -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.color)} (índice ${COLUMN_INDICES.color})`);

  // Calidad (G = índice 6)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.calidad,
        endColumnIndex: COLUMN_INDICES.calidad + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.calidad.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ Calidad -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.calidad)} (índice ${COLUMN_INDICES.calidad})`);

  // Talla (I = índice 8)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.talla,
        endColumnIndex: COLUMN_INDICES.talla + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.talla.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ Talla -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.talla)} (índice ${COLUMN_INDICES.talla})`);

  // Medida tipo (J = índice 9)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.medidaS,
        endColumnIndex: COLUMN_INDICES.medidaS + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.medidaS.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ MedidaS -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.medidaS)} (índice ${COLUMN_INDICES.medidaS})`);

  // Ubicacion (O = índice 14)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.ubicacion,
        endColumnIndex: COLUMN_INDICES.ubicacion + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.ubicacion.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ Ubicación -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.ubicacion)} (índice ${COLUMN_INDICES.ubicacion})`);

  // Estado (Q = índice 16)
  validationRequests.push({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: rowCount + 200,
        startColumnIndex: COLUMN_INDICES.estado,
        endColumnIndex: COLUMN_INDICES.estado + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: DROPDOWN_OPTIONS.estado.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  });
  console.log(`✓ Estado -> Columna ${String.fromCharCode(65 + COLUMN_INDICES.estado)} (índice ${COLUMN_INDICES.estado})`);

  // Ejecutar todas las validaciones
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    resource: { requests: validationRequests },
  });

  console.log('\n=== COMPLETADO ===');
  console.log('Las validaciones de dropdown han sido corregidas.');
  console.log('Por favor recarga la hoja de Google Sheets (Ctrl+Shift+R) para ver los cambios.');
}

fixDropdownColumns().catch(console.error);
