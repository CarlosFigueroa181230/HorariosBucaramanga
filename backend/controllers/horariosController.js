const db = require('../db');

// Función de ayuda para convertir tiempos como "2:00 PM" a formato "14:00:00"
function convertTo24Hour(timeStr) {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*([ap]m)/i);
    if (!match) return null;
    let [_, hours, minutes, modifier] = match;
    hours = parseInt(hours, 10);
    if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
    if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
}

// Función de ayuda para parsear celdas completas como "4:00 PM - 5:40 PM K520"
function parseScheduleStr(str) {
    if (!str) return null;
    const match = str.trim().match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s+(.*))?/i);
    if (!match) return null;
    return {
        hora_inicio: convertTo24Hour(match[1]),
        hora_fin: convertTo24Hour(match[2]),
        salon: match[3] ? match[3].trim() : ''
    };
}

// Función que busca algo en la base de datos, si no existe lo crea y devuelve el ID
const findOrCreate = async (connection, table, colName, value, extraCols = {}) => {
    let query = `SELECT id_${table.toLowerCase()} as id FROM ${table} WHERE ${colName} = ?`;
    let [rows] = await connection.execute(query, [value]);

    if (rows.length > 0) {
        return rows[0].id;
    } else {
        const keys = [colName, ...Object.keys(extraCols)];
        const values = [value, ...Object.values(extraCols)];
        const placeholders = keys.map(() => '?').join(', ');

        const insertQuery = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const [result] = await connection.execute(insertQuery, values);
        return result.insertId;
    }
};

exports.uploadExcelData = async (req, res) => {
    const { sheets, fileName, creadorId, fechaInicio, fechaFin, descripcion, tipo, facultadFormulario } = req.body;

    if (!sheets) {
        return res.status(400).json({ success: false, message: 'No se encontraron datos en el request' });
    }

    let connection;
    try {
        // Obtenemos una conexión de la "piscina" (pool)
        connection = await db.getConnection();

        // Iniciamos la transacción (Se ejecutará Todo o Nada, por seguridad)
        await connection.beginTransaction();

        // 1. Registrar la acción en Reporte PRIMERO para obtener el ID y vincular publicaciones
        let userId = creadorId ? parseInt(creadorId) : 1;
        let tipoPub = tipo || 'Horarios de Clases';
        let descPub = descripcion || 'Cargados mediante archivo Excel';
        let fInicio = fechaInicio || null;
        let fFin = fechaFin || null;

        // Determinar ID Facultad Principal para el Reporte
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

        // 2. Crear la "Escuela de Ingenierías" si no existe como base
        const escuelaId = await findOrCreate(connection, 'Escuela', 'nombre', 'Escuela de Ingenierías', { fecha_creacion: new Date() });

        let currentSemestreId = null;
        let currentOpcionId = null;

        const keysSheets = Object.keys(sheets);
        for (const sheetName of keysSheets) {
            const data = sheets[sheetName].data;
            let currentNivel = null;

            for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
                const row = data[rowIdx];
                try {
                    const isExamen = tipoPub.toLowerCase().includes('examen') || tipoPub.toLowerCase().includes('supletorio');
                    const isExtracurricular = tipoPub.toLowerCase().includes('extracurricular');

                    // DETECCIÓN DINÁMICA DE ENCABEZADO DE SEMESTRE (NO para extracurriculares)
                    let foundSemestre = false;
                    let semestreText = "";

                    // Detección agresiva de divisores de semestre u opciones
                    if (!isExtracurricular) {
                        for (const key of Object.keys(row)) {
                            const value = (row[key] || "").toString().trim();
                            if (value.toLowerCase().includes('semestre') || value.toLowerCase().includes('opción') || value.toLowerCase().includes('opcion')) {
                                foundSemestre = true;
                                semestreText = value;
                                break;
                            }
                        }
                    }

                    if (foundSemestre) {
                        currentNivel = semestreText;
                        const facNameHeader = row.FACULTAD || row.FAC || facultadFormulario || 'FACULTAD GENERAL';
                        const facultadIdHeader = await findOrCreate(connection, 'Facultad', 'nombre', facNameHeader, { id_escuela: escuelaId, fecha_creacion: new Date() });

                        await connection.execute(
                            'INSERT INTO Publicacion (nrc, id_facultad, id_reporte, nivel) VALUES (?, ?, ?, ?)',
                            ['HEADER', facultadIdHeader, currentReporteId, currentNivel]
                        );
                        continue;
                    }

                    const facField = row.FACULTAD ? row.FACULTAD.toString().trim() : '';

                    if (isExamen) {
                        if (row.ASIGNATURA || row.NRC) {
                            const facName = row.FAC || row.FACULTAD || facultadFormulario || (isExtracurricular ? 'General' : 'Sin Facultad');
                            const facultadId = await findOrCreate(connection, 'Facultad', 'nombre', facName, { id_escuela: escuelaId, fecha_creacion: new Date() });

                            const asigName = row.ASIGNATURA ? row.ASIGNATURA.toString().trim() : 'Sin Nombre';
                            await connection.execute(`
    INSERT INTO Asignatura (nombre, codigo_materia)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE codigo_materia = VALUES(codigo_materia)
`, [asigName, codigoMateriaStr]);
                            let [asigRows] = await connection.execute('SELECT id_asignatura FROM Asignatura WHERE nombre = ?', [asigName]);
                            const asigId = asigRows[0].id_asignatura;

                            const nrcKey = Object.keys(row).find(k => k.toUpperCase().includes('NRC')) || 'NRC';
                            let nrc = row[nrcKey] ? row[nrcKey].toString().trim() : null;

                            // Si no hay NRC en una fila que no es header, le ponemos un valor genérico o null
                            if (!nrc) nrc = '00000';

                            const nivel = row.NIV ? row.NIV.toString().trim() : null;
                            const docente = row.DOCENTE ? row.DOCENTE.toString().trim() : null;

                            const [insPub] = await connection.execute(
                                'INSERT INTO Publicacion (nrc, id_facultad, id_asignatura, id_reporte, nivel, docente) VALUES (?, ?, ?, ?, ?, ?)',
                                [nrc, facultadId, asigId, currentReporteId, nivel, docente]
                            );
                            const publicacionId = insPub.insertId;
                            const pubId = insPub.insertId;

                            const fechaKey = Object.keys(row).find(k => k.toUpperCase().includes('FECHA')) || 'FECHA';
                            const horarioKey = Object.keys(row).find(k => k.toUpperCase().includes('HORARIO')) || 'HORARIO';
                            const salonKey = Object.keys(row).find(k => k.toUpperCase().includes('SALÓN') || k.toUpperCase().includes('SALON')) || 'SALÓN';

                            const fechaVal = row[fechaKey];
                            const horarioVal = row[horarioKey];
                            const salonVal = row[salonKey];

                            if (horarioVal) {
                                const parsed = parseScheduleStr(horarioVal);
                                const h_inicio = parsed ? parsed.hora_inicio : null;
                                const h_fin = parsed ? parsed.hora_fin : null;

                                const [insMat] = await connection.execute(
                                    'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon, fecha_exacta) VALUES (?, ?, ?, ?, ?, ?)',
                                    [asigName, null, h_inicio, h_fin, salonVal, fechaVal]
                                );
                                await connection.execute('INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)', [pubId, insMat.insertId]);
                            }
                        }
                    } else if (isExtracurricular) {
                        const nombreKey = Object.keys(row).find(k => k.toLowerCase().includes('nombre del curso')) || 'ASIGNATURA';
                        if (row[nombreKey] || row.NRC) {
                            const asigName = row[nombreKey] ? row[nombreKey].toString().trim() : 'Curso Extracurricular';
                            await connection.execute('INSERT IGNORE INTO Asignatura (nombre) VALUES (?)', [asigName]);
                            let [asigRows] = await connection.execute('SELECT id_asignatura FROM Asignatura WHERE nombre = ?', [asigName]);
                            const asigId = asigRows[0].id_asignatura;

                            const nrc = row.NRC ? row.NRC.toString().trim() : '00000';
                            const instructorKey = Object.keys(row).find(k => k.toLowerCase().includes('instructor')) || 'Instructor';
                            const docente = row[instructorKey] || null;

                            const [insPub] = await connection.execute(
                                'INSERT INTO Publicacion (nrc, id_asignatura, id_reporte, docente) VALUES (?, ?, ?, ?)',
                                [nrc, asigId, currentReporteId, docente]
                            );
                            const pubId = insPub.insertId;

                            const mapDaysExt = {
                                'LUNES': 'Lunes', 'MARTES': 'Martes', 'MIÉRCOLES': 'Miércoles', 'MIERCOLES': 'Miércoles',
                                'JUEVES': 'Jueves', 'VIERNES': 'Viernes', 'SÁBADO': 'Sábado', 'SABADO': 'Sábado'
                            };
                            const aulaKey = Object.keys(row).find(k => k.toLowerCase().includes('aula')) || 'AULA';

                            for (const key of Object.keys(row)) {
                                const dayName = mapDaysExt[key.toUpperCase()];
                                if (dayName && row[key] && row[key].toString().trim() !== '') {
                                    const parsed = parseScheduleStr(row[key]);
                                    if (parsed) {
                                        const [insMat] = await connection.execute(
                                            'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                            [asigName, dayName, parsed.hora_inicio, parsed.hora_fin, row[aulaKey]]
                                        );
                                        await connection.execute('INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)', [pubId, insMat.insertId]);
                                    }
                                }
                            }
                        }
                    } else {
                        if (row.ASIGNATURA || row.NRC) {
                            const mapFacultades = {
                                'SIST': 'Ingeniería De Sistemas E Informática', 'AMBI': 'Ingeniería Ambiental', 'CIVIL': 'Ingeniería Civil',
                                'CIVI': 'Ingeniería Civil', 'ELEC': 'Ingeniería Eléctrica', 'ELECTRONICA': 'Ingeniería Electrónica',
                                'MEC': 'Ingeniería Mecánica', 'MACA': 'Ingeniería Mecánica', 'IND': 'Ingenieria Industrial', 'ADM': 'Administración De Empresas',
                            };
                            const facFieldMapped = mapFacultades[facField.toUpperCase()] || facField;
                            let finalFacultadName = facultadFormulario || facFieldMapped;

                            const facultadId = await findOrCreate(connection, 'Facultad', 'nombre', finalFacultadName, { id_escuela: escuelaId, fecha_creacion: new Date() });

                            const asigName = row.ASIGNATURA ? row.ASIGNATURA.toString().trim() : 'Desconocida';
                            const materiaKey = Object.keys(row).find(
                                k => k.toUpperCase().includes('MATERIA')
                            );

                            let codigoMateriaStr = materiaKey && row[materiaKey]
                                ? parseInt(row[materiaKey], 10)
                                : null;
                            await connection.execute('INSERT IGNORE INTO Asignatura (nombre, codigo_materia) VALUES (?, ?)', [asigName, codigoMateriaStr]);
                            let [asigRows] = await connection.execute('SELECT id_asignatura FROM Asignatura WHERE nombre = ?', [asigName]);
                            const asigId = asigRows[0].id_asignatura;

                            const cursoName = row.CURSO ? row.CURSO.toString().trim() : 'N/A';
                            const cursoId = await findOrCreate(connection, 'Curso', 'nombre', cursoName);

                            const nrc = row.NRC ? row.NRC.toString().trim() : '00000';
                            const creditos = row.CRÉDITOS ? parseInt(row.CRÉDITOS, 10) : 0;

                            const [insPub] = await connection.execute(
                                'INSERT INTO Publicacion (nrc, id_facultad, id_asignatura, id_curso, id_opcion, creditos, id_reporte, nivel) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                                [nrc, facultadId, asigId, cursoId, currentOpcionId, creditos, currentReporteId, currentNivel]
                            );
                            const pubId = insPub.insertId;

                            // NUEVO: Procesar los días de la semana para materias normales
                            const mapDays = {
                                'LUN': 'Lunes', 'MAR': 'Martes', 'MIER': 'Miércoles',
                                'JUEV': 'Jueves', 'VIER': 'Viernes', 'SAB': 'Sábado'
                            };

                            for (const key of Object.keys(row)) {
                                const upperKey = key.toUpperCase();
                                const dayName = mapDays[upperKey];
                                if (dayName && row[key] && row[key].toString().trim() !== '') {
                                    const parsed = parseScheduleStr(row[key]);
                                    if (parsed) {
                                        const [insMat] = await connection.execute(
                                            'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                            [asigName, dayName, parsed.hora_inicio, parsed.hora_fin, parsed.salon || 'Por asignar']
                                        );
                                        await connection.execute('INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)', [pubId, insMat.insertId]);
                                    }
                                }
                            }
                        } catch (rowErr) {
                            console.error(`Error en hoja "${sheetName}", fila ${rowIdx + 2}:`, rowErr.message);
                            throw new Error(`Error en hoja "${sheetName}", fila ${rowIdx + 2}: ${rowErr.message}`);
                        }
                    }
                }
        }

            // Si se llegó a este punto, todas las consultas fueron exitosas
            await connection.commit();
            connection.release();

            res.json({ success: true, message: 'Datos guardados exitosamente. Tu Base de Datos ya tiene los horarios del Excel.' });
        } catch (err) {
            console.error('Error in Database Transaction:', err);

            // Traducir errores técnicos de base de datos a lenguaje humano
            let friendlyMessage = err.message;
            if (err.code === 'ER_DATA_TOO_LONG') friendlyMessage = "Uno de los textos es demasiado largo para ser guardado.";
            if (err.code === 'ER_DUP_ENTRY') friendlyMessage = "Entrada duplicada detectada.";
            if (err.code === 'ER_BAD_NULL_ERROR') friendlyMessage = "Falta un dato obligatorio en esta fila.";

            if (connection) {
                await connection.rollback();
                connection.release();
            }
            res.status(500).json({
                success: false,
                message: 'Hubo un problema al procesar el Excel',
                error: friendlyMessage
            });
        }
    };

    exports.getHorarios = async (req, res) => {
        const { facultad, tipo } = req.query;

        const tipoMap = {
            'horarios': 'Horarios de Clases',
            'examenes': 'Exámenes Parciales',
            'intersemestrales': 'Cursos Intersemestrales',
            'supletorios': 'Exámenes Supletorios',
            'extracurriculares': 'Cursos Extracurriculares'
        };

        // Si viene 'horarios' o 'Horarios de Clases', ambos deben funcionar
        const tipoFinal = tipoMap[tipo] || (tipo === 'horarios' ? 'Horarios de Clases' : tipo);

        try {
            let query = `
            SELECT 
                p.id_publicacion,
                p.nrc,
                p.creditos,
                a.nombre as asignatura,
                f.nombre as facultad_nombre,
                m.dia,
                m.hora_inicio,
                m.hora_fin,
                m.salon,
                m.fecha_exacta,
                p.docente,
                p.nivel,
                r.tipo as reporte_tipo,
                c.nombre as curso_nombre,
                a.codigo_materia
            FROM Publicacion p
            JOIN Facultad f ON p.id_facultad = f.id_facultad
            LEFT JOIN Asignatura a ON p.id_asignatura = a.id_asignatura
            LEFT JOIN Publicacion_Materia pm ON p.id_publicacion = pm.id_publicacion
            LEFT JOIN Materia m ON pm.id_materia = m.id_materia
            LEFT JOIN Reporte r ON p.id_reporte = r.id_reporte
            LEFT JOIN Curso c ON p.id_curso = c.id_curso
            WHERE 1=1
        `;
            let params = [];
            if (facultad) {
                query += ` AND (f.nombre = ? OR f.nombre LIKE ?)`;
                const queryFacultad = '%' + facultad.replace(/-/g, ' ') + '%';
                params.push(facultad, queryFacultad);
            }

            if (tipo) {
                query += ` AND r.tipo = ?`;
                params.push(tipoFinal);
            }

            console.log('🔍 Ejecutando Query:', query);
            console.log('📦 Con parámetros:', params);
            const [rows] = await db.execute(query, params);
            console.log('✅ Filas encontradas:', rows.length);

            // Agrupar por id_publicacion para construir los días
            const map = {};
            for (const r of rows) {
                if (!map[r.id_publicacion]) {
                    map[r.id_publicacion] = {
                        asignatura: r.asignatura,
                        materia: r.codigo_materia || r.asignatura,
                        curso: r.curso_nombre || 'N/A',
                        nrc: r.nrc,
                        creditos: r.creditos,
                        profesor: r.docente || "Asignado",
                        aula: r.salon || "Por asignar",
                        fecha: r.fecha_exacta ? (typeof r.fecha_exacta === 'string' ? r.fecha_exacta : r.fecha_exacta.toISOString().split('T')[0]) : "Pendiente",
                        nivel: r.nivel || "N/A",
                        facultad: r.facultad_nombre,
                        reporte_tipo: r.reporte_tipo,
                        cupos: 40,
                        lunes: "--",
                        martes: "--",
                        miercoles: "--",
                        jueves: "--",
                        viernes: "--",
                        sabado: "--"
                    };
                }
                // Parse schedule block
                if (r.dia) {
                    const diaNormalizado = r.dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // miércoles -> miercoles
                    const horaInicio = r.hora_inicio ? r.hora_inicio.substring(0, 5) : "";
                    const horaFin = r.hora_fin ? r.hora_fin.substring(0, 5) : "";
                    if (horaInicio && horaFin) {
                        map[r.id_publicacion][diaNormalizado] = `${horaInicio}-${horaFin}`;
                    }
                }
            }

            const data = Object.values(map);
            res.json({ success: true, horarios: data });
        } catch (error) {
            console.error('🔥 Error Detallado al obtener horarios:');
            console.error('Mensaje:', error.message);
            console.error('Stack:', error.stack);
            if (error.sql) console.error('SQL Executed:', error.sql);
            res.status(500).json({ success: false, message: 'Error del servidor al obtener horarios', error: error.message });
        }
    };
