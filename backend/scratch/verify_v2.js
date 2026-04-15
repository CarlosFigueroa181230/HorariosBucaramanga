const { uploadExcelData, getHorarios } = require('../controllers/horariosController');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
};

const testData = {
    fileName: "Test_V2.xlsx",
    tipo: "horarios", // Should be normalized to "Horarios de Clases"
    sheets: {
        "Hoja1": {
            data: [
                {
                    "FACULTAD": "SIST",
                    "ASIGNATURA": "CALCULO INTEGRAL",
                    "MATERIA": 9937,
                    "NRC": 10984,
                    "CREDITOS": 3,
                    "NIV": "SEGUNDO SEMESTRE",
                    "MIER": "2:00 PM - 3:40 PM L205"
                }
            ]
        }
    }
};

async function verify() {
    console.log('--- Inician pruebas V2 ---');
    try {
        await uploadExcelData({ body: testData }, res);
        console.log('Upload result:', res.data.success ? 'SUCCESS' : 'FAILED', res.data.message || '');

        if (res.data.success) {
            const db = require('../db');
            
            console.log('--- Verificando Publicacion ---');
            const [pubs] = await db.query('SELECT * FROM Publicacion WHERE nrc = "10984"');
            console.table(pubs);

            console.log('--- Verificando Materia ---');
            const [mats] = await db.query('SELECT * FROM Materia');
            console.table(mats);

            console.log('--- Verificando Reporte tipo ---');
            const [reps] = await db.query('SELECT * FROM Reporte WHERE id_reporte = ?', [pubs[0].id_reporte]);
            console.log('Report Type:', reps[0].tipo);

            console.log('--- Probando búsqueda (getHorarios) ---');
            const reqSearch = {
                query: {
                    tipo: 'horarios',
                    facultad: 'Ingeniería De Sistemas E Informática'
                }
            };
            await getHorarios(reqSearch, res);
            console.log('Search results count:', res.data.horarios ? res.data.horarios.length : 0);
            if (res.data.horarios && res.data.horarios.length > 0) {
                console.log('Primer resultado materia:', res.data.horarios[0].materia);
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

verify();
