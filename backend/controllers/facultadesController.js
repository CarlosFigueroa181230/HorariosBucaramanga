const db = require('../db');

exports.getFacultades = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT f.id_facultad as id, f.nombre as facultad, e.nombre as escuela FROM Facultad f JOIN Escuela e ON f.id_escuela = e.id_escuela');
        res.json({ success: true, facultades: rows });
    } catch (error) {
        console.error('Error al obtener facultades:', error);
        res.status(500).json({ success: false, message: 'Error del servidor al obtener facultades' });
    }
};
