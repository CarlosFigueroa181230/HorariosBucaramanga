exports.uploadExcelData = async (req, res) => {
    const { sheets, fileName, creadorId, fechaInicio, fechaFin, descripcion, tipo, facultadFormulario } = req.body;

    if (!sheets) {
        return res.status(400).json({ success: false, message: 'No se encontraron datos en el request' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. Registrar la acción en Reporte PRIMERO
        let userId = creadorId ? parseInt(creadorId) : 1;
        let tipoPub = tipo || 'Horarios de Clases';
        let descPub = descripcion || 'Cargados mediante archivo Excel';
        let fInicio = fechaInicio || null;
        let fFin = fechaFin || null;

        // Determinar ID Facultad Principal
        let globalFacultadId = null;
        if (facultadFormulario) {
            let [facs] = await connection.execute('SELECT id_facultad FROM Facultad WHERE nombre = ? OR nombre LIKE ? LIMIT 1', [facultadFormulario, `%${facultadFormulario}%`]);
            if (facs.length > 0) globalFacultadId = facs[0].id_facultad;
        }

        const [reporteResult] = await connection.execute(
            `INSERT INTO Reporte (tipo, id_facultad, disponible, id_creador, fecha_inicio, fecha_fin, descripcion, fecha_creacion, archivo_nombre) 
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
            [tipoPub, globalFacultadId, 1, userId, fInicio, fFin, descPub, fileName || 'archivo_desconocido.xlsx']
        );
        const currentReporteId = reporteResult.insertId;

        const escuelaId = await findOrCreate(connection, 'Escuela', 'nombre', 'Escuela de Ingenierías', { fecha_creacion: new Date() });

        const keysSheets = Object.keys(sheets);
        for (const sheetName of keysSheets) {
            const data = sheets[sheetName].data;
            let currentNivel = null;

            for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                const row = data[rowIdx];
                try {
                    const isExamen = tipoPub.toLowerCase().includes('examen') || tipoPub.toLowerCase().includes('supletorio');
                    const isExtracurricular = tipoPub.toLowerCase().includes('extracurricular');

                    // --- DETECCIÓN DE ENCABEZADO (Solo horarios habituales) ---
                    let foundSemestre = false;
                    if (!isExtracurricular) {
                        for (const key of Object.keys(row)) {
                            const value = (row[key] || "").toString().trim();
                            if (value.toLowerCase().includes('semestre') || value.toLowerCase().includes('opcion') || value.toLowerCase().includes('opción') || (value.toLowerCase().includes('nivel') && value.length < 20)) {
                                foundSemestre = true;
                                currentNivel = value;
                                break;
                            }
                        }
                    }

                    if (foundSemestre) {
                        const facNameHeader = getValByPattern(row, 'FACULTAD') || getValByPattern(row, 'FAC') || facultadFormulario || 'FACULTAD GENERAL';
                        const facultadIdHeader = await findOrCreate(connection, 'Facultad', 'nombre', facNameHeader, { id_escuela: escuelaId, fecha_creacion: new Date() });

                        await connection.execute(
                            'INSERT INTO Publicacion (nrc, id_facultad, id_reporte, nivel) VALUES (?, ?, ?, ?)',
                            ['HEADER', facultadIdHeader, currentReporteId, currentNivel]
                        );
                        continue;
                    }

                    // --- EXTRACCIÓN DE DATOS COMUNES ---
                    let asigName, nrc, facultadName, docente = null, creditos = 0, nivelRow = currentNivel;

                    if (isExamen) {
                        asigName = getValByPattern(row, 'ASIGNATURA');
                        nrc = getValByPattern(row, 'NRC');
                        facultadName = getValByPattern(row, 'FAC') || getValByPattern(row, 'FACULTAD') || facultadFormulario || 'General';
                        nivelRow = getValByPattern(row, 'NIV') || currentNivel;
                    } else if (isExtracurricular) {
                        asigName = getValByPattern(row, 'Nombre del Curso') || getValByPattern(row, 'Actividad') || getValByPattern(row, 'ASIGNATURA');
                        nrc = getValByPattern(row, 'NRC') || '00000';
                        facultadName = 'Cursos Extracurriculares';
                        docente = getValByPattern(row, 'Instructor') || getValByPattern(row, 'Nombre y ID');
                    } else {
                        asigName = getValByPattern(row, 'ASIGNATURA') || getValByPattern(row, 'Materia') || getValByPattern(row, 'MATERIA'); // A veces viene solo 'MATERIA'
                        nrc = getValByPattern(row, 'NRC');
                        facultadName = getValByPattern(row, 'FACULTAD') || getValByPattern(row, 'FAC') || facultadFormulario || 'General';
                        creditos = parseInt(getValByPattern(row, 'CREDITOS') || getValByPattern(row, 'CRÉDITOS') || 0);
                        nivelRow = getValByPattern(row, 'NIV') || currentNivel;
                    }

                    // Si no hay asignatura y no hay NRC, asumimos fila vacía
                    if (!asigName && !nrc) continue;

                    // --- INSERCIÓN Y OBTENCIÓN DE IDs RELACIONALES ---
                    const facultadId = await findOrCreate(connection, 'Facultad', 'nombre', facultadName, { id_escuela: escuelaId, fecha_creacion: new Date() });
                    
                    const codigoMateriaObj = getValByPattern(row, 'MATERIA');
                    const codigoMateriaStr = (codigoMateriaObj && !isNaN(parseInt(codigoMateriaObj))) ? parseInt(codigoMateriaObj, 10) : null;
                    
                    await connection.execute(`
                        INSERT INTO Asignatura (nombre, codigo_materia) 
                        VALUES (?, ?) 
                        ON DUPLICATE KEY UPDATE codigo_materia = COALESCE(VALUES(codigo_materia), codigo_materia)
                    `, [asigName || 'Sin Nombre', codigoMateriaStr]);
                    
                    let [asigRows] = await connection.execute('SELECT id_asignatura FROM Asignatura WHERE nombre = ?', [asigName || 'Sin Nombre']);
                    const asigId = asigRows[0].id_asignatura;

                    const cursoName = getValByPattern(row, 'CURSO') || 'N/A';
                    const cursoId = await findOrCreate(connection, 'Curso', 'nombre', cursoName);

                    const [insPub] = await connection.execute(
                        'INSERT INTO Publicacion (nrc, id_facultad, id_asignatura, id_curso, id_reporte, creditos, nivel, docente) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [nrc || '00000', facultadId, asigId, cursoId, currentReporteId, creditos, nivelRow, docente]
                    );
                    const pubId = insPub.insertId;

                    // --- PROCESAMIENTO DE HORARIOS ---
                    if (isExamen) {
                        const fechaEx = getValByPattern(row, 'FECHA');
                        const horarioEx = getValByPattern(row, 'HORARIO');
                        const salonEx = getValByPattern(row, 'SALON') || getValByPattern(row, 'SALÓN') || getValByPattern(row, 'AULA') || 'Por asignar';
                        
                        // Parsear Date Object si proviene crudo de Excel
                        let finalFecha = fechaEx;
                        if (fechaEx instanceof Date) finalFecha = fechaEx.toISOString().split('T')[0];

                        if (horarioEx) {
                            const parsed = parseScheduleStr(horarioEx.toString());
                            const [insMat] = await connection.execute(
                                'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon, fecha_exacta) VALUES (?, ?, ?, ?, ?, ?)',
                                [asigName, null, parsed ? parsed.hora_inicio : null, parsed ? parsed.hora_fin : null, salonEx, finalFecha]
                            );
                            await connection.execute('INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)', [pubId, insMat.insertId]);
                        }
                    } else {
                        // Horarios Clases y Extracurriculares
                        const dayKeys = ['LUN', 'MAR', 'MIER', 'JUEV', 'VIER', 'SAB', 'DOM', 'LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO'];
                        const rowKeys = Object.keys(row);
                        const fallbackSalon = getValByPattern(row, 'AULA') || getValByPattern(row, 'SALON') || getValByPattern(row, 'SALÓN') || 'Por asignar';

                        for (const key of rowKeys) {
                            const upperK = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "MIERCOLES", "LUN", etc.
                            const isDayColumn = dayKeys.some(dk => dk.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === upperK);
                            
                            if (isDayColumn && row[key] && row[key].toString().trim() !== '') {
                                const dayName = normalizeDayName(key);
                                if (!dayName) continue; // Por si acaso no logra mapear

                                const scheduleStr = row[key].toString().trim();
                                const parsed = parseScheduleStr(scheduleStr);
                                
                                if (parsed) {
                                    const finalSalon = parsed.salon || fallbackSalon;
                                    const [insMat] = await connection.execute(
                                        'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                        [asigName, dayName, parsed.hora_inicio, parsed.hora_fin, finalSalon]
                                    );
                                    await connection.execute('INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)', [pubId, insMat.insertId]);
                                }
                            }
                        }
                    }
                } catch (rowErr) {
                    console.error(`Error en hoja "${sheetName}", fila ${rowIdx + 2}:`, rowErr.message);
                    // Silenciamos throw para no detener el batch por 1 fila mala, pero lo logueamos
                }
            }
        }

        await connection.commit();
        connection.release();
        res.json({ success: true, message: 'Datos guardados exitosamente. Tu Base de Datos ya tiene los horarios del Excel.' });

    } catch (err) {
        console.error('Error in Database Transaction:', err);
        let friendlyMessage = err.message;
        if (err.code === 'ER_DATA_TOO_LONG') friendlyMessage = "Uno de los textos es demasiado largo para ser guardado.";
        if (err.code === 'ER_DUP_ENTRY') friendlyMessage = "Entrada duplicada detectada.";
        if (err.code === 'ER_BAD_NULL_ERROR') friendlyMessage = "Falta un dato obligatorio en esta fila.";

        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.status(500).json({ success: false, message: 'Hubo un problema al procesar el Excel', error: friendlyMessage });
    }
};
