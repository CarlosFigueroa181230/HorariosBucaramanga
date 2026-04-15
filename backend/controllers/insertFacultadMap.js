const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'horariosController.js');
let content = fs.readFileSync(filePath, 'utf8');

// The block we want to insert
const newCode = `
// Mapa de abreviaciones de facultad -> nombre completo en la BD
const FACULTAD_ABBREV_MAP = {
    'sist':    'Ingeniería De Sistemas E Informática',
    'ind':     'Ingeniería Industrial',
    'civil':   'Ingeniería Civil',
    'electronica':    'Ingeniería Electrónica',
    'electrica':   'Ingeniería Eléctrica',
    'mec':     'Ingeniería Mecánica',
    'amb':     'Ingeniería Ambiental',
    'der':     'Derecho',
    'psic':    'Psicología',
    'adm':     'Administración De Empresas',
    'ani':     'Negocios Internacionales',
    'com':     'Comunicación Social - Periodismo',
    'dis':     'Diseño Gráfico',
    'bas':     'Departamento De Ciencias Básicas',
    'hum':     'Departamento De Formación Humanística',
    'cl':     'Centro De Lenguas',
    'ext':     'Electivas',
    'cpyg':    'Ciencias Políticas Y Gobierno',
    'cpyg-n':  'Ciencias Políticas Y Gobierno',
    'cpyg-d':  'Ciencias Políticas Y Gobierno',
};

/**
 * Convierte abreviaciones del Excel (ej. "SIST", "CPyG-N") al nombre completo
 * registrado en la BD. Si no hay mapeo, devuelve el valor original sin cambios.
 */
function resolverNombreFacultad(rawName) {
    if (!rawName) return rawName;
    const key = rawName.toString().trim().toLowerCase().replace(/\\s+/g, ' ');
    return FACULTAD_ABBREV_MAP[key] || rawName;
}
`;

// Check if already inserted
if (content.includes('FACULTAD_ABBREV_MAP')) {
    console.log('FACULTAD_ABBREV_MAP already exists in file. Skipping.');
    process.exit(0);
}

// Insert after the closing of getValByPattern function (before findOrCreate)
const insertBefore = '// Función que busca algo en la base de datos';
const idx = content.indexOf(insertBefore);

if (idx === -1) {
    console.error('Could not find insertion point. Looking for:', insertBefore);
    // Print context around line 60
    const lines = content.split('\n');
    lines.slice(55, 70).forEach((l, i) => console.log(i + 56 + ': ' + l));
    process.exit(1);
}

content = content.slice(0, idx) + newCode + '\n' + content.slice(idx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: FACULTAD_ABBREV_MAP inserted at position', idx);
