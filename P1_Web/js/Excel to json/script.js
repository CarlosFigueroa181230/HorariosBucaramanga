// Excel to JSON Converter - Prototype
console.log('Excel to JSON Converter initialized');

// Global variable to store converted data
let convertedData = null;

// Get DOM elements
const excelFileInput = document.getElementById('excelFile');
const convertBtn = document.getElementById('convertBtn');
const outputSection = document.getElementById('outputSection');
const jsonOutput = document.getElementById('jsonOutput');
const errorMessage = document.getElementById('errorMessage');

// Check if XLSX library is loaded
function waitForXLSX(callback, attempts = 0) {
    if (typeof XLSX !== 'undefined') {
        callback();
    } else if (attempts < 50) {
        // Wait 100ms and try again (max 5 seconds)
        setTimeout(() => waitForXLSX(callback, attempts + 1), 100);
    } else {
        console.error('XLSX library failed to load');
        showError('Error: No se pudo cargar la librería XLSX. Por favor, recarga la página.');
    }
}

/**
 * Main function to convert Excel file to JSON
 */
function convertExcelToJSON() {
    errorMessage.textContent = '';
    
    // Check if file is selected
    if (!excelFileInput.files.length) {
        showError('Por favor selecciona un archivo Excel');
        return;
    }
    
    const file = excelFileInput.files[0];
    
    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                        'application/vnd.ms-excel', 'text/csv'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        showError('Por favor selecciona un archivo válido (Excel o CSV)');
        return;
    }
    
    // Read file
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Convert all sheets to JSON
            const jsonResult = parseWorkbookToJSON(workbook);
            
            convertedData = jsonResult;
            saveToLocalStorage(jsonResult);
            displayJSON(jsonResult);
            
            console.log('Conversión completada exitosamente');
        } catch (error) {
            showError('Error al procesar el archivo: ' + error.message);
            console.error('Error details:', error);
        }
    };
    
    reader.onerror = function() {
        showError('Error al leer el archivo');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Parse Excel workbook to JSON structure
 * @param {Object} workbook - XLSX workbook object
 * @returns {Object} JSON object with table data organized by sheet names
 */
function parseWorkbookToJSON(workbook) {
    const result = {
        fileName: excelFileInput.files[0].name,
        convertedAt: new Date().toISOString(),
        sheets: {}
    };
    
    // Iterate through all sheets
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        
        result.sheets[sheetName] = {
            name: sheetName,
            rows: sheetData.length,
            columns: sheetData.length > 0 ? Object.keys(sheetData[0]) : [],
            data: sheetData
        };
    });
    
    return result;
}

/**
 * Display JSON output in the UI
 * @param {Object} data - JSON data to display
 */
function displayJSON(data) {
    outputSection.style.display = 'block';
    jsonOutput.textContent = JSON.stringify(data, null, 2);
}

/**
 * Save converted JSON to localStorage
 */
function saveToLocalStorage(data) {
    const fileName = excelFileInput.files[0].name.replace(/\.[^/.]+$/, '') + '.json';
    const storageKey = 'json_' + Date.now();
    
    try {
        // Store data with filename and timestamp
        const storageData = {
            fileName: fileName,
            data: data,
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(storageKey, JSON.stringify(storageData));
        
        // Update the list of stored files
        updateStoredFilesList();
        
        console.log('Datos guardados en navegador: ' + fileName);
        showSuccess('Datos guardados como: ' + fileName);
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        showError('Error al guardar los datos: ' + error.message);
    }
}

/**
 * Update and display the list of stored JSON files
 */
function updateStoredFilesList() {
    const storedFiles = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('json_')) {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                storedFiles.push({
                    key: key,
                    fileName: item.fileName,
                    savedAt: item.savedAt
                });
            } catch (e) {
                console.error('Error parsing stored file:', e);
            }
        }
    }
    
    // Display stored files list
    displayStoredFiles(storedFiles);
}

/**
 * Display error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.backgroundColor = '#fee';
    errorMessage.style.color = '#c33';
    outputSection.style.display = 'none';
}

/**
 * Display success message
 * @param {string} message - Success message to display
 */
function showSuccess(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    errorMessage.style.backgroundColor = '#f0fdf4';
    errorMessage.style.color = '#166534';
    errorMessage.style.borderColor = '#22c55e';
}

/**
 * Display list of stored JSON files
 * @param {Array} files - Array of stored files
 */
function displayStoredFiles(files) {
    if (files.length === 0) return;
    
    let html = '<h3>Archivos guardados en el navegador:</h3><ul style="margin-top: 10px;">';
    
    files.forEach(file => {
        const date = new Date(file.savedAt).toLocaleDateString('es-ES');
        html += `<li>${file.fileName} (${date})</li>`;
    });
    
    html += '</ul>';
    
    const listElement = document.getElementById('storedFilesList');
    if (listElement) {
        listElement.innerHTML = html;
        listElement.style.display = 'block';
    }
}

/**
 * Clear error message
 */
function clearError() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

// Event listeners
convertBtn.addEventListener('click', function() {
    waitForXLSX(convertExcelToJSON);
});
excelFileInput.addEventListener('change', clearError);

// Load stored files on page load
window.addEventListener('load', function() {
    waitForXLSX(updateStoredFilesList);
});

console.log('Event listeners attached successfully');
