const db = require('./db');

async function migrate() {
    try {
        console.log('🚀 Iniciando migración de base de datos...');
        
        // 1. Agregar columna docente a Publicacion
        console.log('--- Agregando columna "docente" a Publicacion...');
        await db.execute('ALTER TABLE Publicacion ADD COLUMN docente VARCHAR(255) NULL');
        
        // 2. Agregar columna nivel a Publicacion
        console.log('--- Agregando columna "nivel" a Publicacion...');
        await db.execute('ALTER TABLE Publicacion ADD COLUMN nivel VARCHAR(50) NULL');

        console.log('✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_COLUMN_NAME') {
            console.log('⚠️ Las columnas ya existen. Saltando migración.');
            process.exit(0);
        } else {
            console.error('❌ Error durante la migración:', error);
            process.exit(1);
        }
    }
}

migrate();
