const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function clearPublicaciones() {
    let connection;
    try {
        console.log('--- Iniciando limpieza de base de datos ---');
        console.log('DB Host:', process.env.DB_HOST);

        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
            'Publicacion_Materia',
            'Publicacion',
            'Materia',
            'Reporte',
            'Asignatura',
            'Curso'
        ];

        for (const table of tables) {
            console.log(`Limpiando tabla: ${table}...`);
            await connection.execute(`TRUNCATE TABLE ${table}`);
        }

        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('--- Limpieza completada exitosamente ---');
        process.exit(0);
    } catch (error) {
        console.error('Error durante la limpieza:', error);
        if (connection) {
            await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
            await connection.end();
        }
        process.exit(1);
    }
}

clearPublicaciones();
