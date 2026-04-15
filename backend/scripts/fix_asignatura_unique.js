const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    let connection;
    try {
        console.log('🚀 Iniciando limpieza y migración de la tabla Asignatura...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME
        });

        // 1. Identificar registros duplicados y elegir cuál conservar
        // Priorizamos los registros que tienen codigo_materia NO null
        console.log('--- Buscando duplicados en Asignatura...');
        const [rows] = await connection.execute(`
            SELECT nombre, COUNT(*) as count 
            FROM Asignatura 
            GROUP BY nombre 
            HAVING count > 1
        `);

        for (const duplicate of rows) {
            console.log(`Limpiando duplicados para: "${duplicate.nombre}"`);
            
            // Obtener todos los IDs para este nombre, ordenados para tener los que tienen código primero
            const [ids] = await connection.execute(
                'SELECT id_asignatura, codigo_materia FROM Asignatura WHERE nombre = ? ORDER BY codigo_materia DESC, id_asignatura ASC',
                [duplicate.nombre]
            );

            const bestId = ids[0].id_asignatura;
            const otherIds = ids.slice(1).map(r => r.id_asignatura);

            if (otherIds.length > 0) {
                // Re-vincular publicaciones a la asignatura que vamos a conservar
                console.log(`Re-vinculando publicaciones de ${otherIds.length} duplicados al ID ${bestId}...`);
                await connection.execute(
                    `UPDATE Publicacion SET id_asignatura = ? WHERE id_asignatura IN (${otherIds.join(',')})`,
                    [bestId]
                );

                // Borrar los duplicados
                console.log(`Borrando registros duplicados...`);
                await connection.execute(
                    `DELETE FROM Asignatura WHERE id_asignatura IN (${otherIds.join(',')})`
                );
            }
        }

        // 2. Añadir la restricción UNIQUE
        console.log('--- Añadiendo restricción UNIQUE a Asignatura(nombre)...');
        try {
            await connection.execute('ALTER TABLE Asignatura ADD UNIQUE INDEX idx_asignatura_nombre (nombre)');
            console.log('✅ Índice UNIQUE añadido correctamente.');
        } catch (idxErr) {
            if (idxErr.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️ El índice ya existe.');
            } else {
                throw idxErr;
            }
        }

        console.log('✅ Proceso de migración completado exitosamente.');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
    } finally {
        if (connection) await connection.end();
        process.exit(0);
    }
}

migrate();
