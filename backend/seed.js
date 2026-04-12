const db = require('./db');
const fs = require('fs');
const path = require('path');

const DEFAULT_FACULTADES = [
    { id: 1, facultad: 'Administración De Empresas', escuela: 'Escuela de Administración y Negocios', fechaActualizacion: '2026-03-04' },
    { id: 2, facultad: 'Centro De Lenguas', escuela: 'Escuela de Idiomas y Lenguas Modernas', fechaActualizacion: '2026-03-04' },
    { id: 3, facultad: 'Ciencias Políticas Y Gobierno', escuela: 'Escuela de Gobierno y Relaciones Institucionales', fechaActualizacion: '2026-03-04' },
    { id: 4, facultad: 'Comunicación Social - Periodismo', escuela: 'Escuela de Comunicación y Medios', fechaActualizacion: '2026-03-04' },
    { id: 5, facultad: 'Departamento De Ciencias Básicas', escuela: 'Escuela de Ciencias Básicas', fechaActualizacion: '2026-03-04' },
    { id: 6, facultad: 'Departamento De Formación Humanística', escuela: 'Escuela de Humanidades y Formación Integral', fechaActualizacion: '2026-03-04' },
    { id: 7, facultad: 'Derecho', escuela: 'Escuela de Derecho', fechaActualizacion: '2026-03-04' },
    { id: 8, facultad: 'Diseño Gráfico', escuela: 'Escuela de Diseño y Creatividad', fechaActualizacion: '2026-03-04' },
    { id: 9, facultad: 'Electivas', escuela: 'Escuela de Cursos Electivos', fechaActualizacion: '2026-03-04' },
    { id: 10, facultad: 'Ingenieria Industrial', escuela: 'Escuela de Ingeniería Industrial', fechaActualizacion: '2026-03-04' },
    { id: 11, facultad: 'Ingeniería Ambiental', escuela: 'Escuela de Ingeniería Ambiental', fechaActualizacion: '2026-03-04' },
    { id: 12, facultad: 'Ingeniería Civil', escuela: 'Escuela de Ingeniería Civil', fechaActualizacion: '2026-03-04' },
    { id: 13, facultad: 'Ingeniería Electrónica', escuela: 'Escuela de Ingeniería Electrónica', fechaActualizacion: '2026-03-04' },
    { id: 14, facultad: 'Ingeniería Eléctrica', escuela: 'Escuela de Ingeniería Eléctrica', fechaActualizacion: '2026-03-04' },
    { id: 15, facultad: 'Ingeniería Mecánica', escuela: 'Escuela de Ingeniería Mecánica', fechaActualizacion: '2026-03-04' },
    { id: 16, facultad: 'Ingeniería De Sistemas E Informática', escuela: 'Escuela de Sistemas e Informática', fechaActualizacion: '2026-03-04' },
    { id: 17, facultad: 'Negocios Internacionales', escuela: 'Escuela de Negocios Internacionales', fechaActualizacion: '2026-03-04' },
    { id: 18, facultad: 'Psicología', escuela: 'Escuela de Psicología', fechaActualizacion: '2026-03-04' }
];

async function seed() {
    try {
        console.log('Iniciando seed de facultades y escuelas...');

        for (const item of DEFAULT_FACULTADES) {
            // 1. Encontrar o crear la Escuela
            let [escuelas] = await db.execute('SELECT id_escuela FROM Escuela WHERE nombre = ?', [item.escuela]);
            let id_escuela;

            if (escuelas.length === 0) {
                const [resultEsc] = await db.execute('INSERT INTO Escuela (nombre, fecha_creacion) VALUES (?, CURDATE())', [item.escuela]);
                id_escuela = resultEsc.insertId;
                console.log(`Creada escuela: ${item.escuela}`);
            } else {
                id_escuela = escuelas[0].id_escuela;
            }

            // 2. Encontrar o crear la Facultad
            let [facultades] = await db.execute('SELECT id_facultad FROM Facultad WHERE nombre = ?', [item.facultad]);
            
            if (facultades.length === 0) {
                await db.execute('INSERT INTO Facultad (id_escuela, nombre, fecha_creacion) VALUES (?, ?, CURDATE())', [id_escuela, item.facultad]);
                console.log(`Creada facultad: ${item.facultad}`);
            } else {
                console.log(`Facultad ya existe: ${item.facultad}`);
            }
        }
        // 3. Crear usuario administrador por defecto
        let [usuarios] = await db.execute('SELECT id_usuario FROM Usuario WHERE usuario = ?', ['admin']);
        if (usuarios.length === 0) {
            await db.execute('INSERT INTO Usuario (usuario, contrasena, rol) VALUES (?, ?, ?)', ['admin', 'admin123', 'admin']);
            console.log('Creado usuario admin por defecto: admin / admin123');
        } else {
            console.log('El usuario admin ya existe.');
        }
        
        console.log('Seed completado.');
        process.exit(0);
    } catch (e) {
        console.error('Error durante el seed:', e);
        process.exit(1);
    }
}

seed();
