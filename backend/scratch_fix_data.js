const db = require('./db');

async function fixData() {
    try {
        console.log('Iniciando vinculación de datos...');
        
        // 1. Obtener el ID de la facultad de Sistemas
        const [facultades] = await db.query("SELECT id_facultad FROM Facultad WHERE nombre = 'Ingeniería De Sistemas E Informática'");
        if (facultades.length === 0) {
            console.log('No se encontró la facultad de Sistemas.');
            return;
        }
        const idFacultad = facultades[0].id_facultad;
        console.log('ID Facultad Sistemas:', idFacultad);

        // 2. Obtener un ID de reporte tipo "Horarios de Clases"
        const [reportes] = await db.query("SELECT id_reporte FROM Reporte WHERE tipo = 'Horarios de Clases' LIMIT 1");
        if (reportes.length === 0) {
            console.log('No se encontró un reporte de tipo "Horarios de Clases".');
            return;
        }
        const idReporte = reportes[0].id_reporte;
        console.log('ID Reporte a vincular:', idReporte);

        // 3. Actualizar las publicaciones huérfanas
        const [result] = await db.execute(
            "UPDATE Publicacion SET id_reporte = ? WHERE id_facultad = ? AND id_reporte IS NULL",
            [idReporte, idFacultad]
        );

        console.log('✅ Vinculación completada.');
        console.log('Filas actualizadas:', result.affectedRows);

    } catch (error) {
        console.error('❌ Error vinculando datos:', error);
    } finally {
        process.exit(0);
    }
}

fixData();
