const { uploadExcelData } = require('../controllers/horariosController');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Mock express response
const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
};

const testData = {
    fileName: "Test_Upload.xlsx",
    sheets: {
        "Hoja1": {
            data: [
                {
                    "FACULTAD": "SEGUNDO SEMESTRE",
                    "ASIGNATURA": "",
                    "MATERIA": "",
                    "NRC": ""
                },
                {
                    "FACULTAD": "SIST",
                    "ASIGNATURA": "CALCULO INTEGRAL",
                    "MATERIA": 9937,
                    "NRC": 10984,
                    "MIER": "2:00 PM - 3:40 PM L205"
                }
            ]
        }
    }
};

async function verify() {
    console.log('--- Inician pruebas de carga ---');
    try {
        await uploadExcelData({ body: testData }, res);
        console.log('Resultado carga:', JSON.stringify(res.data, null, 2));

        if (res.data.success) {
            console.log('--- Verificando datos guardados en la BD ---');
            const db = require('../db');
            const [rows] = await db.query('SELECT * FROM Asignatura WHERE nombre = "CALCULO INTEGRAL"');
            console.log('Fila Asignatura encontrada:', JSON.stringify(rows, null, 2));
            
            const [pubs] = await db.query('SELECT * FROM Publicacion WHERE nrc = "10984"');
            console.log('Publicacion vinculada:', JSON.stringify(pubs, null, 2));

            const [headers] = await db.query('SELECT * FROM Publicacion WHERE nrc = "HEADER" ORDER BY id_publicacion DESC LIMIT 1');
            console.log('Header detectado:', JSON.stringify(headers, null, 2));
        }

    } catch (err) {
        console.error('Error en verificación:', err);
    } finally {
        process.exit(0);
    }
}

verify();
