const db = require('./db');

async function clearPublicaciones() {
    let connection;
    try {
        connection = await db.getConnection();
        console.log('--- Iniciando limpieza de base de datos ---');

        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
            'Publicacion_Materia',
            'Publicacion',
            'Materia',
            'Reporte'
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
        if (connection) await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        process.exit(1);
    }
}

clearPublicaciones();
