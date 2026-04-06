const db = require('../db');

exports.getReportes = async (req, res) => {
    try {
        const query = `
            SELECT 
                r.id_reporte as id,
                r.tipo,
                f.nombre as facultad,
                r.disponible,
                r.archivo_nombre as archivo,
                u.usuario as creador,
                r.fecha_inicio,
                r.fecha_fin,
                r.descripcion,
                r.fecha_creacion
            FROM Reporte r
            LEFT JOIN Facultad f ON r.id_facultad = f.id_facultad
            LEFT JOIN Usuario u ON r.id_creador = u.id_usuario
            ORDER BY r.id_reporte DESC
        `;
        const [rows] = await db.execute(query);

        // Mapeamos los datos para asegurarse de que el front los procese bien
        const reportes = rows.map(r => ({
            id: r.id,
            tipo: r.tipo || 'Desconocido',
            facultad: r.facultad || 'Todas',
            disponible: r.disponible ? 'Sí' : 'No',
            archivo: r.archivo || 'N/A',
            creador: r.creador || 'Desconocido',
            fechaInicio: r.fecha_inicio ? r.fecha_inicio.toISOString().split('T')[0] : 'N/A',
            fechaFin: r.fecha_fin ? r.fecha_fin.toISOString().split('T')[0] : 'N/A',
            descripcion: r.descripcion || 'Sin descripción',
            fechaCreacion: r.fecha_creacion ? r.fecha_creacion.toISOString().split('T')[0] : 'N/A'
        }));

        res.json({ success: true, reportes });
    } catch (error) {
        console.error('Error obteniendo reportes:', error);
        res.status(500).json({ success: false, message: 'Error interno obteniendo reportes', error: error.message });
    }
};
