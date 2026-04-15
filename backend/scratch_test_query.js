const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkStatus() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Reporte 1 ---');
        const [reportes] = await connection.execute('SELECT * FROM Reporte WHERE id_reporte = 1');
        console.table(reportes);

        console.log('--- Publicacion rows count ---');
        const [counts] = await connection.execute('SELECT count(*) as count FROM Publicacion');
        console.log('Total publications:', counts[0].count);

        console.log('--- Test Query ---');
        const query = `
            SELECT 
                p.id_publicacion,
                f.nombre as facultad_nombre,
                r.tipo as reporte_tipo
            FROM Publicacion p
            JOIN Facultad f ON p.id_facultad = f.id_facultad
            LEFT JOIN Reporte r ON p.id_reporte = r.id_reporte
            WHERE f.nombre LIKE '%Sistemas%'
        `;
        const [results] = await connection.execute(query);
        console.log('Results with Sistemas:', results.length);
        if (results.length > 0) console.table(results.slice(0, 5));

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

checkStatus();
