// Excel Editor - Load, Edit and Export Excel files from localStorage
console.log('Excel Editor initialized');

// Global variables to store data
let convertedData = null;
let currentSheet = null;
let workbookData = null;
let currentStorageKey = null;
let savedTables = [];

// DOM elements
const fileListSection = document.getElementById('fileListSection');
const noFilesMessage = document.getElementById('noFilesMessage');
const savedFileSelect = document.getElementById('savedFileSelect');
const loadFileBtn = document.getElementById('loadFileBtn');
const deleteFileBtn = document.getElementById('deleteFileBtn');
const outputSection = document.getElementById('outputSection');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const tableOutput = document.getElementById('tableOutput');
const errorMessage = document.getElementById('errorMessage');
const exportBtn = document.getElementById('exportBtn');
const addRowBtn = document.getElementById('addRowBtn');
const backBtn = document.getElementById('backBtn');
const sheetSelector = document.getElementById('sheetSelector');
const sheetSelect = document.getElementById('sheetSelect');

// Check if XLSX library is loaded
function waitForXLSX(callback, attempts = 0) {
    if (typeof XLSX !== 'undefined') {
        callback();
    } else if (attempts < 50) {
        setTimeout(() => waitForXLSX(callback, attempts + 1), 100);
    } else {
        showError('Error: No se pudo cargar la librería XLSX. Por favor, recarga la página.');
    }
}

// Show error messages
function showError(message) {
    errorMessage.textContent = message;
    console.error(message);
}

// Clear error messages
function clearError() {
    errorMessage.textContent = '';
}

/**
 * Load saved tables from localStorage and display in selector
 */
function loadSavedTables() {
    savedTables = [];
    
    console.log('Buscando tablas guardadas en localStorage...');
    console.log('localStorage.length:', localStorage.length);
    
    // Find all tables saved in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log('Clave encontrada:', key);
        
        if (key && key.startsWith('table_')) {
            try {
                const itemString = localStorage.getItem(key);
                console.log('Contenido de clave:', key, itemString ? 'presente' : 'vacío');
                
                const item = JSON.parse(itemString);
                console.log('Item parseado:', item);
                
                savedTables.push({
                    key: key,
                    fileName: item.fileName,
                    savedAt: item.savedAt,
                    data: item.data
                });
                
                console.log('Tabla agregada:', item.fileName);
            } catch (e) {
                console.error('Error parsing stored file con clave ' + key + ':', e);
            }
        }
    }
    
    console.log('Total de tablas encontradas:', savedTables.length);
    
    // Sort by saved date (newest first)
    savedTables.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    
    // Display selector or no files message
    if (savedTables.length > 0) {
        console.log('Mostrando selector de tablas');
        displayTableSelector();
        fileListSection.style.display = 'flex';
        noFilesMessage.style.display = 'none';
    } else {
        console.log('No se encontraron tablas, mostrando mensaje');
        fileListSection.style.display = 'none';
        noFilesMessage.style.display = 'block';
    }
}

/**
 * Display table selector dropdown
 */
function displayTableSelector() {
    savedFileSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Selecciona una tabla --';
    savedFileSelect.appendChild(defaultOption);
    
    savedTables.forEach((table, index) => {
        const option = document.createElement('option');
        const date = new Date(table.savedAt).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        option.value = index;
        option.textContent = `${table.fileName} (${date})`;
        savedFileSelect.appendChild(option);
    });
    
    console.log('Dropdown actualizado con', savedTables.length, 'tablas');
}

/**
 * Load selected table and display in editable format
 */
function loadSelectedTable() {
    clearError();
    
    const selectedIndex = parseInt(savedFileSelect.value);
    console.log('Índice seleccionado:', selectedIndex);
    console.log('Tablas disponibles:', savedTables.length);
    
    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= savedTables.length) {
        showError('Por favor selecciona una tabla válida');
        return;
    }
    
    const selectedTable = savedTables[selectedIndex];
    console.log('Tabla seleccionada:', selectedTable);
    
    if (!selectedTable || !selectedTable.data) {
        showError('Error: los datos de la tabla no se cargaron correctamente');
        console.error('selectedTable:', selectedTable);
        return;
    }
    
    currentStorageKey = selectedTable.key;
    
    // Load the convertedData structure from the saved table
    workbookData = selectedTable.data;
    
    console.log('workbookData.sheets:', Object.keys(workbookData.sheets || {}));
    
    // Setup sheet selector if multiple sheets
    setupSheetSelector();
    
    // Display first sheet
    const sheetNames = Object.keys(workbookData.sheets || {});
    if (sheetNames.length === 0) {
        showError('Error: la tabla no contiene hojas');
        return;
    }
    
    currentSheet = sheetNames[0];
    
    fileNameDisplay.textContent = `Editando: ${selectedTable.fileName}`;
    displayEditableTable(currentSheet);
    
    fileListSection.style.display = 'none';
    noFilesMessage.style.display = 'none';
    outputSection.style.display = 'block';
    console.log('Tabla cargada para editar:', selectedTable.fileName);
}

/**
 * Setup sheet selector dropdown for multiple sheets
 */
function setupSheetSelector() {
    const sheetNames = Object.keys(workbookData.sheets);
    
    if (sheetNames.length > 1) {
        sheetSelector.style.display = 'flex';
        sheetSelect.innerHTML = '';
        
        sheetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sheetSelect.appendChild(option);
        });
        
        sheetSelect.addEventListener('change', (e) => {
            currentSheet = e.target.value;
            displayEditableTable(currentSheet);
        });
    }
}

/**
 * Display editable table for selected sheet
 */
function displayEditableTable(sheetName) {
    console.log('displayEditableTable llamado para:', sheetName);
    console.log('workbookData.sheets disponibles:', Object.keys(workbookData.sheets || {}));
    
    const sheetData = workbookData.sheets[sheetName];
    
    console.log('sheetData:', sheetData);
    
    if (!sheetData) {
        const error = `No se encontraron datos para la hoja: ${sheetName}`;
        console.error(error);
        tableOutput.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">' + error + '</p>';
        return;
    }
    
    if (!sheetData.data || sheetData.data.length === 0) {
        tableOutput.innerHTML = '<p style="padding: 20px; text-align: center; color: #999;">No hay datos para mostrar</p>';
        return;
    }
    
    console.log('Creando tabla con', sheetData.data.length, 'filas y', sheetData.columns.length, 'columnas');
    
    const table = document.createElement('table');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add row number column header
    const rowNumHeader = document.createElement('th');
    rowNumHeader.textContent = '#';
    rowNumHeader.style.width = '50px';
    headerRow.appendChild(rowNumHeader);
    
    // Add column headers
    sheetData.columns.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column;
        headerRow.appendChild(th);
    });
    
    // Add delete column header
    const deleteHeader = document.createElement('th');
    deleteHeader.textContent = 'Acción';
    deleteHeader.style.width = '80px';
    headerRow.appendChild(deleteHeader);
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body with editable cells
    const tbody = document.createElement('tbody');
    
    sheetData.data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = rowIndex;
        
        // Add row number cell
        const rowNumCell = document.createElement('td');
        rowNumCell.className = 'row-number';
        rowNumCell.textContent = rowIndex + 1;
        tr.appendChild(rowNumCell);
        
        // Add data cells (editable)
        sheetData.columns.forEach(column => {
            const td = document.createElement('td');
            td.contentEditable = true;
            td.textContent = row[column] || '';
            td.dataset.column = column;
            
            // Save data on blur
            td.addEventListener('blur', () => {
                sheetData.data[rowIndex][column] = td.textContent;
            });
            
            // Allow pressing Tab to move to next cell and Shift+Tab for previous
            td.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const cells = Array.from(tbody.querySelectorAll('tr')[rowIndex].querySelectorAll('td'));
                    const currentIndex = cells.indexOf(td);
                    
                    if (e.shiftKey) {
                        // Shift+Tab: move to previous cell
                        if (currentIndex > 1) {
                            cells[currentIndex - 1].focus();
                        }
                    } else {
                        // Tab: move to next cell
                        if (currentIndex < cells.length - 2) {
                            cells[currentIndex + 1].focus();
                        }
                    }
                }
            });
            
            tr.appendChild(td);
        });
        
        // Add delete button
        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-row-btn';
        deleteBtn.textContent = '🗑️ Borrar';
        deleteBtn.onclick = () => deleteRow(rowIndex, sheetName);
        deleteCell.appendChild(deleteBtn);
        tr.appendChild(deleteCell);
        
        tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    tableOutput.innerHTML = '';
    tableOutput.appendChild(table);
}

/**
 * Delete a row from the table and data
 */
function deleteRow(rowIndex, sheetName) {
    if (confirm('¿Estás seguro de que deseas eliminar esta fila?')) {
        const sheetData = workbookData.sheets[sheetName];
        sheetData.data.splice(rowIndex, 1);
        displayEditableTable(sheetName);
    }
}

/**
 * Add a new empty row to the table
 */
function addNewRow() {
    const sheetData = workbookData.sheets[currentSheet];
    
    // Create empty row with same columns
    const newRow = {};
    sheetData.columns.forEach(column => {
        newRow[column] = '';
    });
    
    sheetData.data.push(newRow);
    displayEditableTable(currentSheet);
}

/**
 * Delete a saved table from localStorage
 */
function deleteSelectedTable() {
    const selectedIndex = savedFileSelect.value;
    if (selectedIndex === '') {
        showError('Por favor selecciona una tabla');
        return;
    }
    
    const selectedTable = savedTables[selectedIndex];
    
    if (confirm(`¿Estás seguro de que deseas eliminar "${selectedTable.fileName}"? Esta acción no se puede deshacer.`)) {
        try {
            localStorage.removeItem(selectedTable.key);
            loadSavedTables();
            clearError();
            console.log('Tabla eliminada:', selectedTable.fileName);
        } catch (error) {
            showError('Error al eliminar la tabla: ' + error.message);
        }
    }
}

/**
 * Go back to table selector
 */
function backToTableSelector() {
    outputSection.style.display = 'none';
    fileListSection.style.display = 'flex';
    currentStorageKey = null;
    workbookData = null;
    clearError();
}

/**
 * Export edited data back to Excel file
 */
async function exportToExcel() {
    try {
        // Ask user for filename (without extension). Default to 'horas_beta'
        let baseName = prompt('Nombre del archivo (sin extensión):', 'horas_beta');
        if (baseName === null) baseName = 'horas_beta';
        baseName = (baseName || '').toString().trim();
        if (!baseName) baseName = 'horas_beta';
        // Prefer using ExcelJS in-browser to produce real styles (borders, bold headers)
        if (typeof ExcelJS === 'undefined') {
            await loadExcelJSScript();
        }

        if (typeof ExcelJS !== 'undefined') {
            await exportToExcelUsingExcelJS(baseName);
            return;
        }

        // Fallback to SheetJS if ExcelJS isn't available
        const newWorkbook = XLSX.utils.book_new();
        
        // Add all sheets to the workbook
        Object.entries(workbookData.sheets).forEach(([sheetName, sheetData]) => {
            // Use the known columns as header order when available
            const worksheet = XLSX.utils.json_to_sheet(sheetData.data, { header: sheetData.columns || undefined });
            applyThinBorderToWorksheet(worksheet);
            boldHeaderRow(worksheet, 0);
            XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
        });

        // Build a weekly summary sheet (Monday - Sunday) aggregating subjects and their times
        const weeklySheet = buildWeeklySummarySheet(workbookData.sheets);
        if (weeklySheet) {
            applyThinBorderToWorksheet(weeklySheet);
            boldHeaderRow(weeklySheet, 0);
            XLSX.utils.book_append_sheet(newWorkbook, weeklySheet, 'WeeklySchedule');
        }

        // Generate filename with timestamp using user-provided baseName
        const timestamp = new Date().toISOString().slice(0, 10);
        const originalName = baseName || (workbookData.fileName ? workbookData.fileName.replace(/\.[^/.]+$/, '') : 'export');
        const newFileName = `${originalName}_editado_${timestamp}.xlsx`;
        
        // Write file
        XLSX.writeFile(newWorkbook, newFileName);
        clearError();
        console.log('Archivo exportado exitosamente (SheetJS fallback):', newFileName);
    } catch (error) {
        showError('Error al exportar el archivo: ' + error.message);
        console.error('Export error:', error);
    }
}

// Dynamically load ExcelJS from CDN
function loadExcelJSScript() {
    return new Promise((resolve, reject) => {
        try {
            const existing = document.querySelector('script[data-exceljs]');
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener('error', () => reject(new Error('Failed to load ExcelJS')));
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js';
            script.async = true;
            script.setAttribute('data-exceljs', 'true');
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load ExcelJS'));
            document.head.appendChild(script);
        } catch (e) {
            reject(e);
        }
    });
}

// Export using ExcelJS to get real Excel styles (borders, bold headers)
async function exportToExcelUsingExcelJS(baseName) {
    try {
        const workbook = new ExcelJS.Workbook();

        // Add each sheet
        Object.entries(workbookData.sheets).forEach(([sheetName, sheetData]) => {
            const ws = workbook.addWorksheet(sheetName);
            const headers = sheetData.columns && sheetData.columns.length ? sheetData.columns : Object.keys(sheetData.data[0] || {});

            // Add header row
            ws.addRow(headers);
            const headerRow = ws.getRow(1);
            headerRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.alignment = { vertical: 'middle', horizontal: 'left' };
                cell.border = {
                    top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                };
            });

            // Add data rows
            (sheetData.data || []).forEach(rowObj => {
                const row = headers.map(h => rowObj[h] != null ? rowObj[h] : '');
                const added = ws.addRow(row);
                added.eachCell(cell => {
                    cell.border = {
                        top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
                    };
                });
            });

            // Auto width (simple heuristic)
            headers.forEach((h, i) => {
                const max = Math.max(h.toString().length, ...(ws.getColumn(i+1).values || []).map(v => (v||'').toString().length));
                ws.getColumn(i+1).width = Math.min(Math.max(max + 2, 10), 50);
            });
            // Ensure every populated cell has a thin border (defensive pass)
            try {
                for (let r = 1; r <= ws.rowCount; r++) {
                    for (let c = 1; c <= ws.columnCount; c++) {
                        const cell = ws.getCell(r, c);
                        if (!cell) continue;
                        cell.border = cell.border || {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }
            } catch (e) {
                console.warn('Failed to enforce borders on worksheet', sheetName, e);
            }
        });

        // Add weekly sheet
        const weeklySheet = buildWeeklySummarySheet(workbookData.sheets);
        if (weeklySheet) {
            const ws = workbook.addWorksheet('WeeklySchedule');
            // Convert worksheet object from SheetJS into rows
            const ref = weeklySheet['!ref'];
            const range = ref ? XLSX.utils.decode_range(ref) : null;
            const headers = [];
            if (range) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({r: range.s.r, c: C});
                    const cell = weeklySheet[cellRef];
                    headers.push(cell ? cell.v : '');
                }
            }
            if (headers.length === 0 && weeklySheet && weeklySheet.A1) headers.push(weeklySheet.A1.v);
            ws.addRow(headers);
            const headerRow = ws.getRow(1);
            headerRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
            });

            const rows = XLSX.utils.sheet_to_json(weeklySheet, {header:1, range:1});
            rows.forEach(r => {
                const added = ws.addRow(r);
                added.eachCell(cell => {
                    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
                });
            });
            // Defensive pass to ensure borders applied to all cells in WeeklySchedule
            try {
                for (let r = 1; r <= ws.rowCount; r++) {
                    for (let c = 1; c <= ws.columnCount; c++) {
                        const cell = ws.getCell(r, c);
                        if (!cell) continue;
                        cell.border = cell.border || {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }
            } catch (e) {
                console.warn('Failed to enforce borders on WeeklySchedule', e);
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const timestamp = new Date().toISOString().slice(0,10);
        const originalName = baseName || (workbookData.fileName ? workbookData.fileName.replace(/\.[^/.]+$/, '') : 'export');
        const fileName = `${originalName}_editado_${timestamp}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        clearError();
        console.log('Archivo exportado exitosamente (ExcelJS):', fileName);
    } catch (e) {
        console.error('exportToExcelUsingExcelJS failed:', e);
        throw e;
    }
}

// Helper: apply a thin border style to all cells present in a worksheet
function applyThinBorderToWorksheet(worksheet) {
    try {
        const borderStyle = { style: 'thin', color: { rgb: 'FF000000' } };
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellAddress = {c: C, r: R};
                const cellRef = XLSX.utils.encode_cell(cellAddress);
                const cell = worksheet[cellRef];
                if (!cell) continue;
                // Ensure style object exists and set full border
                cell.s = cell.s || {};
                cell.s.border = {
                    top: borderStyle,
                    bottom: borderStyle,
                    left: borderStyle,
                    right: borderStyle
                };
            }
        }
    } catch (e) {
        console.warn('applyThinBorderToWorksheet failed:', e);
    }
}

// Helper: make header row bold (rowIndex is 0-based)
function boldHeaderRow(worksheet, rowIndex) {
    try {
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({r: rowIndex, c: C});
            const cell = worksheet[cellRef];
            if (!cell) continue;
            cell.s = cell.s || {};
            cell.s.font = cell.s.font || {};
            cell.s.font.bold = true;
        }
    } catch (e) {
        console.warn('boldHeaderRow failed:', e);
    }
}

// Helper: build a weekly summary sheet from all sheets' data
function buildWeeklySummarySheet(sheets) {
    try {
        const possibleSubjectKeys = ['Materia','Asignatura','Subject','materia','asignatura','subject','Nombre','nombre'];
        const possibleDayKeys = ['Dia','Día','Day','dia','day'];
        const possibleTimeKeys = ['Hora','Time','hora','time','Horario','horario','HoraInicio','Inicio'];

        const dayMap = {
            lun: 'Monday', mar: 'Tuesday', mie: 'Wednesday', mié: 'Wednesday', jue: 'Thursday', vie: 'Friday', sab: 'Saturday', dom: 'Sunday',
            mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
        };

        const summary = {}; // subject -> day -> [times]

        Object.values(sheets).forEach(sheetData => {
            const cols = (sheetData.columns || []);
            const subjectKey = cols.find(c => possibleSubjectKeys.includes(c)) || cols.find(c => possibleSubjectKeys.map(k=>k.toLowerCase()).includes(c.toLowerCase()));
            const dayKey = cols.find(c => possibleDayKeys.includes(c)) || cols.find(c => possibleDayKeys.map(k=>k.toLowerCase()).includes(c.toLowerCase()));
            const timeKey = cols.find(c => possibleTimeKeys.includes(c)) || cols.find(c => possibleTimeKeys.map(k=>k.toLowerCase()).includes(c.toLowerCase()));

            if (!sheetData.data || sheetData.data.length === 0) return;

            sheetData.data.forEach(row => {
                const subject = subjectKey ? (row[subjectKey] || row[subjectKey.toLowerCase()] || '').toString().trim() : (row[0] || '').toString().trim();
                if (!subject) return;

                let dayRaw = dayKey ? (row[dayKey] || row[dayKey.toLowerCase()] || '').toString().trim() : '';
                let timeRaw = timeKey ? (row[timeKey] || row[timeKey.toLowerCase()] || '').toString().trim() : '';

                // Normalize day to English weekday name
                let dayNorm = '';
                if (dayRaw) {
                    const token = dayRaw.toLowerCase().slice(0,3);
                    dayNorm = dayMap[token] || '';
                }

                // If day not found, try to extract weekday words
                if (!dayNorm && dayRaw) {
                    Object.keys(dayMap).forEach(k => {
                        if (dayRaw.toLowerCase().includes(k)) dayNorm = dayMap[k];
                    });
                }

                if (!summary[subject]) summary[subject] = {};
                const dayKeyForMap = dayNorm || 'Unspecified';
                summary[subject][dayKeyForMap] = summary[subject][dayKeyForMap] || [];
                if (timeRaw) summary[subject][dayKeyForMap].push(timeRaw);
            });
        });

        const subjects = Object.keys(summary);
        if (subjects.length === 0) return null;

        const header = ['Subject','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday','Unspecified'];
        const rows = subjects.map(subject => {
            const entry = { Subject: subject };
            header.slice(1).forEach(day => {
                const times = summary[subject][day];
                entry[day] = times && times.length ? times.join(' | ') : '';
            });
            return entry;
        });

        const worksheet = XLSX.utils.json_to_sheet(rows, {header: header});
        // Ensure header labels
        header.forEach((h, i) => {
            const cellRef = XLSX.utils.encode_cell({r:0, c:i});
            if (!worksheet[cellRef]) worksheet[cellRef] = { t: 's', v: h };
        });
        return worksheet;
    } catch (e) {
        console.warn('buildWeeklySummarySheet failed:', e);
        return null;
    }
}

// Event listeners
loadFileBtn.addEventListener('click', () => {
    waitForXLSX(() => loadSelectedTable());
});

deleteFileBtn.addEventListener('click', () => {
    deleteSelectedTable();
});

exportBtn.addEventListener('click', () => {
    exportToExcel();
});

addRowBtn.addEventListener('click', () => {
    addNewRow();
});

backBtn.addEventListener('click', () => {
    backToTableSelector();
});

// Load saved tables on page load
window.addEventListener('load', () => {
    waitForXLSX(() => {
        loadSavedTables();
        console.log('XLSX library loaded successfully');
    });
});
