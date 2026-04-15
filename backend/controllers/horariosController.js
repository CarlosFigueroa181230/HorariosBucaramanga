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

// Función para normalizar nombres de días (quitar tildes y asegurar formato DB)
function normalizeDayName(dayStr) {
    if (!dayStr) return null;
    const days = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miercoles', // DB ENUM sin tilde
        'miércoles': 'Miercoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sabado', // DB ENUM sin tilde
        'sábado': 'Sabado'
    };
    const key = dayStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Intentar match con mapa o devolver normalizado
    return days[key] || days[dayStr.toLowerCase()] || null;
}

// Función de ayuda para parsear celdas completas como "4:00 PM - 5:40 PM K520"
function parseScheduleStr(str) {
    if (!str) return null;
    // Captura formatos como "HH:MM AM - HH:MM PM SALON"
    const match = str.trim().match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)(?:\s+(.*))?/i);
    if (!match) return null;
    return {
        hora_inicio: convertTo24Hour(match[1]),
        hora_fin: convertTo24Hour(match[2]),
        salon: match[3] ? match[3].trim() : ''
    };
}

// Función para encontrar una columna en el objeto row ignorando tildes y mayúsculas
function getValByPattern(row, pattern) {
    const keys = Object.keys(row);
    const normalizedPattern = pattern.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Prioridad 1: Match exacto (sin tildes)
    const bestMatch = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalizedPattern);
    if (bestMatch) return row[bestMatch];
    
    // Prioridad 2: Contiene el patrón
    const partialMatch = keys.find(k => k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normalizedPattern));
    return partialMatch ? row[partialMatch] : null;
}


// Mapa de abreviaciones de facultad -> nombre completo en la BD
const FACULTAD_ABBREV_MAP = {
    'sist':    'Ingeniería De Sistemas E Informática',
    'ind':     'Ingeniería Industrial',
    'civil':   'Ingeniería Civil',
    'elec':    'Ingeniería Electrónica',
    'elect':   'Ingeniería Eléctrica',
    'mec':     'Ingeniería Mecánica',
    'amb':     'Ingeniería Ambiental',
    'der':     'Derecho',
    'psic':    'Psicología',
    'adm':     'Administración De Empresas',
    'neg':     'Negocios Internacionales',
    'com':     'Comunicación Social - Periodismo',
    'dis':     'Diseño Gráfico',
    'bas':     'Departamento De Ciencias Básicas',
    'hum':     'Departamento De Formación Humanística',
    'lng':     'Centro De Lenguas',
    'ext':     'Electivas',
    'cpyg':    'Ciencias Políticas Y Gobierno',
    'cpyg-n':  'Ciencias Políticas Y Gobierno',
    'cpyg-d':  'Ciencias Políticas Y Gobierno',
};

/**
 * Convierte abreviaciones del Excel (ej. "SIST", "CPyG-N") al nombre completo
 * registrado en la BD. Si no hay mapeo, devuelve el valor original sin cambios.
 */
function resolverNombreFacultad(rawName) {
    if (!rawName) return rawName;
    const key = rawName.toString().trim().toLowerCase().replace(/\s+/g, ' ');
    return FACULTAD_ABBREV_MAP[key] || rawName;
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
                        const facNameHeaderRaw = getValByPattern(row, 'FACULTAD') || getValByPattern(row, 'FAC') || facultadFormulario || 'FACULTAD GENERAL';
                        const facNameHeader = resolverNombreFacultad(facNameHeaderRaw);
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
                        facultadName = resolverNombreFacultad(
                            getValByPattern(row, 'FAC') || getValByPattern(row, 'FACULTAD') || facultadFormulario || 'General'
                        );
                        nivelRow = getValByPattern(row, 'NIV') || currentNivel;
                    } else if (isExtracurricular) {
                        asigName = getValByPattern(row, 'Nombre del Curso') || getValByPattern(row, 'Actividad') || getValByPattern(row, 'ASIGNATURA');
                        nrc = getValByPattern(row, 'NRC') || '00000';
                        facultadName = 'Cursos Extracurriculares';
                        docente = getValByPattern(row, 'Instructor') || getValByPattern(row, 'Nombre y ID');
                    } else {
                        asigName = getValByPattern(row, 'ASIGNATURA') || getValByPattern(row, 'Materia') || getValByPattern(row, 'MATERIA');
                        nrc = getValByPattern(row, 'NRC');
                        facultadName = resolverNombreFacultad(
                            getValByPattern(row, 'FACULTAD') || getValByPattern(row, 'FAC') || facultadFormulario || 'General'
                        );
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
                        const horarioEx = getValByPattern(row, 'HORARIO') || getValByPattern(row, 'HORA');
                        const salonEx = getValByPattern(row, 'SALON') || getValByPattern(row, 'SALÓN') || getValByPattern(row, 'AULA') || 'Por asignar';
                        
                        // Parsear Date Object si proviene crudo de Excel
                        let finalFecha = fechaEx;
                        if (fechaEx instanceof Date) finalFecha = fechaEx.toISOString().split('T')[0];
                        else if (typeof fechaEx === 'number') {
                            // Número serial de Excel -> fecha
                            const d = new Date(Math.round((fechaEx - 25569) * 86400 * 1000));
                            finalFecha = d.toISOString().split('T')[0];
                        }

                        // Intentar parsear horario; si falla, guardar con nulos
                        let parsedHora = horarioEx ? parseScheduleStr(horarioEx.toString()) : null;
                        // Soporte para columnas separadas HORA_INICIO / HORA_FIN
                        const horaInicioCol = getValByPattern(row, 'HORA_INICIO') || getValByPattern(row, 'HORA INICIO') || getValByPattern(row, 'INICIO');
                        const horaFinCol    = getValByPattern(row, 'HORA_FIN')   || getValByPattern(row, 'HORA FIN')   || getValByPattern(row, 'FIN');
                        if (!parsedHora && (horaInicioCol || horaFinCol)) {
                            parsedHora = {
                                hora_inicio: horaInicioCol ? convertTo24Hour(horaInicioCol.toString()) : null,
                                hora_fin:    horaFinCol    ? convertTo24Hour(horaFinCol.toString())    : null,
                                salon: ''
                            };
                        }

                        // Siempre insertar en Materia para que Publicacion_Materia no quede null
                        const [insMat] = await connection.execute(
                            'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon, fecha_exacta) VALUES (?, ?, ?, ?, ?, ?)',
                            [
                                asigName,
                                null,
                                parsedHora ? parsedHora.hora_inicio : null,
                                parsedHora ? parsedHora.hora_fin    : null,
                                parsedHora?.salon || salonEx,
                                finalFecha || null
                            ]
                        );
                        await connection.execute(
                            'INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)',
                            [pubId, insMat.insertId]
                        );
                    } else {
                        // Horarios Clases y Extracurriculares
                        // Columnas de días reconocidas (abreviadas y completas)
                        const dayKeys = [
                            'LUN', 'MAR', 'MIER', 'JUEV', 'VIER', 'SAB', 'DOM',
                            'LUNES', 'MARTES', 'MIERCOLES', 'MIÉRCOLES',
                            'JUEVES', 'VIERNES', 'SABADO', 'SÁBADO', 'DOMINGO'
                        ];
                        const rowKeys = Object.keys(row);
                        const fallbackSalon = getValByPattern(row, 'AULA') || getValByPattern(row, 'SALON') || getValByPattern(row, 'SALÓN') || 'Por asignar';
                        let insertedAnyMateria = false;

                        for (const key of rowKeys) {
                            const upperK = key.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            const isDayColumn = dayKeys.some(dk => dk.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === upperK);
                            
                            if (isDayColumn && row[key] && row[key].toString().trim() !== '') {
                                const dayName = normalizeDayName(key);
                                if (!dayName) continue;

                                const scheduleStr = row[key].toString().trim();
                                const parsed = parseScheduleStr(scheduleStr);
                                
                                if (parsed) {
                                    const finalSalon = parsed.salon || fallbackSalon;
                                    const [insMat] = await connection.execute(
                                        'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                        [asigName, dayName, parsed.hora_inicio, parsed.hora_fin, finalSalon]
                                    );
                                    await connection.execute(
                                        'INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)',
                                        [pubId, insMat.insertId]
                                    );
                                    insertedAnyMateria = true;
                                } else {
                                    // Horario en formato no estándar: insertar fila con solo el día y texto raw en salon
                                    const [insMat] = await connection.execute(
                                        'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                        [asigName, dayName, null, null, scheduleStr]
                                    );
                                    await connection.execute(
                                        'INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)',
                                        [pubId, insMat.insertId]
                                    );
                                    insertedAnyMateria = true;
                                }
                            }
                        }

                        // Si no se encontró ninguna columna de día, insertar al menos una fila en Materia
                        // para que Publicacion_Materia no quede vacía
                        if (!insertedAnyMateria) {
                            const [insMat] = await connection.execute(
                                'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                [asigName, null, null, null, fallbackSalon]
                            );
                            await connection.execute(
                                'INSERT INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)',
                                [pubId, insMat.insertId]
                            );
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
                query += ` AND (r.tipo = ? OR r.tipo LIKE ?)`;
                params.push(tipoFinal, `%${tipoFinal}%`);
            }

            console.log('🔍 Ejecutando Query:', query);
            const [rows] = await db.execute(query, params);

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
            console.error('🔥 Error Detallado al obtener horarios:', error.message);
            res.status(500).json({ success: false, message: 'Error del servidor al obtener horarios', error: error.message });
        }
    };
