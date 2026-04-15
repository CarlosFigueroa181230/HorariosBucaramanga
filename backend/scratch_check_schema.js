const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function checkSchema() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        console.log('--- Publicacion Columns ---');
        const [pubCols] = await connection.execute('SHOW COLUMNS FROM Publicacion');
        console.table(pubCols);

        console.log('--- Checking for data in Publicacion ---');
        const [publicaciones] = await connection.execute('SELECT * FROM Publicacion LIMIT 5');
        console.table(publicaciones);

        console.log('--- Checking for data in Publicacion_Materia ---');
        const [pm] = await connection.execute('SELECT * FROM Publicacion_Materia LIMIT 5');
        console.table(pm);

        console.log('--- Checking Faculties ---');
        const [facs] = await connection.execute('SELECT id_facultad, nombre FROM Facultad');
        console.table(facs);

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

checkSchema();
