/**
 * Google Apps Script - Cloudinary Image Uploader for Tierra Madre Inventory
 *
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. Abre tu Google Sheet
 * 2. Ve a Extensiones > Apps Script
 * 3. Borra todo el código existente
 * 4. Copia y pega todo este archivo
 * 5. Guarda (Ctrl+S)
 * 6. Recarga la hoja de cálculo
 * 7. Verás un nuevo menú "Tierra Madre"
 *
 * USO:
 * 1. Selecciona la celda de imagen (columna K o L)
 * 2. Haz clic en Tierra Madre > Subir Imagen
 * 3. Selecciona tu imagen
 * 4. La URL se insertará automáticamente
 */

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = 'dyam6g2os';
const CLOUDINARY_UPLOAD_PRESET = 'tierramadre';
const CLOUDINARY_FOLDER = 'tierramadre/inventory';

/**
 * Creates the custom menu when the spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Tierra Madre')
    .addItem('Subir Imagen', 'showUploadDialog')
    .addItem('Ver Imagen Seleccionada', 'showSelectedImage')
    .addSeparator()
    .addItem('Ayuda', 'showHelp')
    .addToUi();
}

/**
 * Shows the upload dialog
 */
function showUploadDialog() {
  const html = HtmlService.createHtmlOutput(getUploadDialogHtml())
    .setWidth(450)
    .setHeight(500)
    .setTitle('Subir Imagen a Cloudinary');

  SpreadsheetApp.getUi().showModalDialog(html, 'Subir Imagen');
}

/**
 * Shows help information
 */
function showHelp() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    'Ayuda - Tierra Madre Image Uploader',
    'CÓMO USAR:\n\n' +
    '1. Selecciona la celda donde quieres poner la imagen (columna K o L)\n' +
    '2. Haz clic en "Tierra Madre" > "Subir Imagen"\n' +
    '3. Arrastra o selecciona tu imagen\n' +
    '4. Espera a que se suba\n' +
    '5. La URL se insertará automáticamente\n\n' +
    'FORMATOS SOPORTADOS:\n' +
    'JPG, PNG, GIF, WebP, HEIC\n\n' +
    'TAMAÑO MÁXIMO:\n' +
    '10MB por imagen',
    ui.ButtonSet.OK
  );
}

/**
 * Shows the selected image in a dialog
 */
function showSelectedImage() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const cell = sheet.getActiveCell();
  const value = cell.getValue();

  if (!value || !value.toString().startsWith('http')) {
    SpreadsheetApp.getUi().alert('La celda seleccionada no contiene una URL de imagen válida.');
    return;
  }

  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
      img { max-width: 100%; max-height: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
      .url { font-size: 12px; color: #666; margin-top: 10px; word-break: break-all; }
    </style>
    <img src="${value}" alt="Imagen del producto">
    <p class="url">${value}</p>
  `)
    .setWidth(500)
    .setHeight(500)
    .setTitle('Vista Previa de Imagen');

  SpreadsheetApp.getUi().showModalDialog(html, 'Vista Previa');
}

/**
 * Inserts the uploaded image as a clickable inline preview
 * Also saves the URL in a new column Q (URL Imagen) for API access
 * Click on the image to open the full-size URL
 *
 * ACTUAL Sheet structure (verified 2024-12-09):
 * J = Medidas (tipo: "largo Ancho")
 * K = Medidas (valores: "0.0/0.0") - DO NOT OVERWRITE!
 * L = Imagen (visual IMAGE formula)
 * M = costo T.madre
 * N = Precio COP
 * O = UBICACION
 * P = ASESOR
 * Q = URL Imagen (NEW - plain text for API)
 */
function insertImageUrl(url) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const cell = sheet.getActiveCell();
  const row = cell.getRow();
  const col = cell.getColumn();

  // Use HYPERLINK + IMAGE so clicking the image opens the URL
  // IMAGE mode 1 = fit to cell, maintaining aspect ratio
  cell.setFormula(`=HYPERLINK("${url}", IMAGE("${url}", 1))`);

  // Save URL as plain text in column Q (17) for API access
  // Column K has Medidas data - DO NOT use it!
  const URL_COLUMN = 17; // Column Q (NEW column for URLs)
  const urlCell = sheet.getRange(row, URL_COLUMN);
  urlCell.setValue(url);

  // Add header if first time using this column
  const headerCell = sheet.getRange(1, URL_COLUMN);
  if (!headerCell.getValue()) {
    headerCell.setValue('URL Imagen');
  }

  // Adjust row height to show preview better (60px)
  sheet.setRowHeight(row, 60);

  // Set column width if it's narrow
  const colWidth = sheet.getColumnWidth(col);
  if (colWidth < 100) {
    sheet.setColumnWidth(col, 100);
  }

  return {
    success: true,
    cell: cell.getA1Notation(),
    urlCell: urlCell.getA1Notation(),
    url: url
  };
}

/**
 * Gets the product name from the same row (column D = Nombre)
 *
 * Actual structure:
 * B = Item, C = FECHA INGRESO, D = Nombre
 */
function getProductName() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveCell().getRow();
  const nameCell = sheet.getRange(row, 4); // Column D = Nombre
  return nameCell.getValue() || `producto_${row}`;
}

/**
 * Returns the HTML for the upload dialog
 */
function getUploadDialogHtml() {
  return `
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      min-height: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .header h2 {
      color: #047857;
      margin: 0 0 5px 0;
      font-size: 18px;
    }

    .header p {
      color: #666;
      margin: 0;
      font-size: 13px;
    }

    .drop-zone {
      border: 2px dashed #059669;
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 15px;
    }

    .drop-zone:hover, .drop-zone.dragover {
      border-color: #047857;
      background: #f0fdf4;
      transform: scale(1.02);
    }

    .drop-zone-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .drop-zone-text {
      color: #059669;
      font-weight: 600;
      margin-bottom: 5px;
    }

    .drop-zone-hint {
      color: #888;
      font-size: 12px;
    }

    .preview {
      display: none;
      text-align: center;
      margin-bottom: 15px;
    }

    .preview img {
      max-width: 100%;
      max-height: 150px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .preview-name {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
    }

    .btn {
      width: 100%;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-bottom: 10px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-secondary {
      background: white;
      color: #059669;
      border: 2px solid #059669;
    }

    .status {
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 13px;
      display: none;
    }

    .status.success {
      background: #d1fae5;
      color: #047857;
      display: block;
    }

    .status.error {
      background: #fee2e2;
      color: #dc2626;
      display: block;
    }

    .status.loading {
      background: #fef3c7;
      color: #d97706;
      display: block;
    }

    .progress-bar {
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
      margin-top: 10px;
      display: none;
    }

    .progress-bar.active {
      display: block;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #059669, #10b981);
      width: 0%;
      transition: width 0.3s ease;
    }

    input[type="file"] {
      display: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>Subir Imagen</h2>
    <p id="productName">Cargando nombre del producto...</p>
  </div>

  <div class="drop-zone" id="dropZone">
    <div class="drop-zone-icon">📸</div>
    <div class="drop-zone-text">Arrastra tu imagen aquí</div>
    <div class="drop-zone-hint">o haz clic para seleccionar</div>
  </div>

  <input type="file" id="fileInput" accept="image/*,.heic,.heif">

  <div class="preview" id="preview">
    <img id="previewImg" src="" alt="Preview">
    <div class="preview-name" id="previewName"></div>
  </div>

  <button class="btn btn-primary" id="uploadBtn" disabled>
    Subir a Cloudinary
  </button>

  <button class="btn btn-secondary" id="cancelBtn" style="display:none;">
    Cancelar
  </button>

  <div class="progress-bar" id="progressBar">
    <div class="progress-bar-fill" id="progressFill"></div>
  </div>

  <div class="status" id="status"></div>

  <script>
    const CLOUD_NAME = '${CLOUDINARY_CLOUD_NAME}';
    const UPLOAD_PRESET = '${CLOUDINARY_UPLOAD_PRESET}';
    const FOLDER = '${CLOUDINARY_FOLDER}';

    let selectedFile = null;
    let productName = 'producto';

    // Get product name from sheet
    google.script.run
      .withSuccessHandler(function(name) {
        productName = name || 'producto';
        document.getElementById('productName').textContent = 'Producto: ' + productName;
      })
      .getProductName();

    // Drop zone events
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const previewImg = document.getElementById('previewImg');
    const previewName = document.getElementById('previewName');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const status = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      // Check by MIME type or extension (for HEIC which some browsers don't recognize)
      const isImage = file && (
        file.type.startsWith('image/') ||
        /\.(heic|heif|jpg|jpeg|png|webp|gif)$/i.test(file.name)
      );
      if (!isImage) {
        showStatus('Por favor selecciona una imagen válida', 'error');
        return;
      }

      selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewName.textContent = file.name + ' (' + formatBytes(file.size) + ')';
        preview.style.display = 'block';
        dropZone.style.display = 'none';
        uploadBtn.disabled = false;
        cancelBtn.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }

    cancelBtn.addEventListener('click', () => {
      selectedFile = null;
      preview.style.display = 'none';
      dropZone.style.display = 'block';
      uploadBtn.disabled = true;
      cancelBtn.style.display = 'none';
      fileInput.value = '';
      status.className = 'status';
    });

    uploadBtn.addEventListener('click', uploadToCloudinary);

    async function uploadToCloudinary() {
      if (!selectedFile) return;

      uploadBtn.disabled = true;
      showStatus('Subiendo imagen...', 'loading');
      progressBar.classList.add('active');

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', FOLDER);

      // Clean product name for public_id
      const cleanName = productName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
      formData.append('public_id', cleanName + '_' + Date.now());

      try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            progressFill.style.width = percent + '%';
          }
        });

        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            progressBar.classList.remove('active');

            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              const imageUrl = response.secure_url;

              // Insert URL into cell
              google.script.run
                .withSuccessHandler(function(result) {
                  showStatus('Imagen subida y guardada en ' + result.cell, 'success');
                  setTimeout(() => google.script.host.close(), 2000);
                })
                .withFailureHandler(function(error) {
                  showStatus('Error al guardar URL: ' + error, 'error');
                  uploadBtn.disabled = false;
                })
                .insertImageUrl(imageUrl);
            } else {
              showStatus('Error al subir: ' + xhr.statusText, 'error');
              uploadBtn.disabled = false;
            }
          }
        };

        xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload');
        xhr.send(formData);

      } catch (error) {
        showStatus('Error: ' + error.message, 'error');
        uploadBtn.disabled = false;
        progressBar.classList.remove('active');
      }
    }

    function showStatus(message, type) {
      status.textContent = message;
      status.className = 'status ' + type;
    }

    function formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  </script>
</body>
</html>
`;
}