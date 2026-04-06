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

        // Creamos la "Escuela de Ingenierías" si no existe como base
        const escuelaId = await findOrCreate(connection, 'Escuela', 'nombre', 'Escuela de Ingenierías', { fecha_creacion: new Date() });

        let currentSemestreId = null;
        let currentOpcionId = null;

        const keysSheets = Object.keys(sheets);
        for (const sheetName of keysSheets) {
            const data = sheets[sheetName].data;
            for (const row of data) {
                const facField = row.FACULTAD ? row.FACULTAD.toString().trim() : '';
                
                // ES UNA FILA CABECERA DE SEMESTRE (Ej. "TERCER SEMESTRE - OPCIÓN 1")
                if (facField.toLowerCase().includes('semestre') && !row.ASIGNATURA && !row.MATERIA) {
                    let semestreName = facField;
                    let opcionName = "ÚNICA"; 

                    // Verificamos si tiene " - OPCIÓN X"
                    if (facField.includes('-')) {
                        const parts = facField.split('-');
                        semestreName = parts[0].trim();
                        opcionName = parts[1].trim();
                    }

                    // Encontrar/Crear Semestre
                    currentSemestreId = await findOrCreate(connection, 'Semestre', 'nombre', semestreName);
                    
                    // Encontrar/Crear Opción (Como el Semestre ya se buscó, buscamos la opción ligada)
                    let [opcRows] = await connection.execute('SELECT id_opcion FROM Opcion WHERE nombre = ? AND id_semestre = ?', [opcionName, currentSemestreId]);
                    if (opcRows.length > 0) {
                        currentOpcionId = opcRows[0].id_opcion;
                    } else {
                        const [insOpc] = await connection.execute('INSERT INTO Opcion (id_semestre, nombre) VALUES (?, ?)', [currentSemestreId, opcionName]);
                        currentOpcionId = insOpc.insertId;
                    }
                    continue; // Pasa a revisar la siguiente fila porque esta sólo era un título
                }

                // ES UNA FILA DE MATERIA NORMAL (Tiene NRC o Nombre de Asignatura)
                if (row.ASIGNATURA || row.NRC) {
                    // Mapeo rudimentario de las abreviaciones del Excel
                    const mapFacultades = {
                        'SIST': 'Ingeniería De Sistemas E Informática',
                        'AMBI': 'Ingeniería Ambiental',
                        'CIVIL': 'Ingeniería Civil',
                        'CIVI': 'Ingeniería Civil',
                        'ELEC': 'Ingeniería Eléctrica',
                        'ELECTRONICA': 'Ingeniería Electrónica',
                        'MEC': 'Ingeniería Mecánica',
                        'MACA': 'Ingeniería Mecánica',
                        'IND': 'Ingenieria Industrial',
                        'ADM': 'Administración De Empresas',
                    };
                    const facFieldMapped = mapFacultades[facField.toUpperCase()] || facField;

                    // Si el usuario especificó la facultad en el formulario, tiene prioridad sobre el Excel
                    let finalFacultadName = facFieldMapped;
                    if (facultadFormulario) {
                        finalFacultadName = facultadFormulario;
                    }

                    // Facultad
                    const facultadId = await findOrCreate(connection, 'Facultad', 'nombre', finalFacultadName, { id_escuela: escuelaId, fecha_creacion: new Date() });
                    
                    // Asignatura
                    const asigName = row.ASIGNATURA ? row.ASIGNATURA.toString().trim() : 'Desconocida';
                    let codigoMateriaStr = row.MATERIA ? parseInt(row.MATERIA, 10) : null;
                    let asigId;

                    let [asigRows] = await connection.execute('SELECT id_asignatura, codigo_materia FROM Asignatura WHERE nombre = ?', [asigName]);
                    if (asigRows.length > 0) {
                        asigId = asigRows[0].id_asignatura;
                        // Si nos pasan un nuevo código y antes estaba null, actualizamos
                        if (codigoMateriaStr && !asigRows[0].codigo_materia) {
                             await connection.execute('UPDATE Asignatura SET codigo_materia = ? WHERE id_asignatura = ?', [codigoMateriaStr, asigId]);
                        }
                    } else {
                        const [insAsig] = await connection.execute('INSERT INTO Asignatura (nombre, codigo_materia) VALUES (?, ?)', [asigName, codigoMateriaStr]);
                        asigId = insAsig.insertId;
                    }

                    // Curso (el grupo)
                    const cursoName = row.CURSO ? row.CURSO.toString().trim() : 'N/A';
                    const cursoId = await findOrCreate(connection, 'Curso', 'nombre', cursoName);

                    // Publicación (NRC, Creditos y llaves foráneas)
                    const nrc = row.NRC ? row.NRC.toString().trim() : '00000';
                    const creditos = row.CRÉDITOS ? parseInt(row.CRÉDITOS, 10) : 0;
                    
                    let pubId;
                    // Verificamos si existe un registro con este NRC para no duplicarlo enteramente.
                    let [pubRows] = await connection.execute('SELECT id_publicacion FROM Publicacion WHERE nrc = ?', [nrc]);
                    if (pubRows.length > 0) {
                        pubId = pubRows[0].id_publicacion;
                        // Opcionalmente, aquí podríamos borrar viejas sesiones de Materia de esta Publicación 
                        // asumiendo que el Excel provee la fuente de datos actualizada 
                        // (Pero temporalmente solo reusaremos el id_publicacion y crearemos nuevos bloques si no existen)
                    } else {
                        // Opcion ID fallback si llegara a subirse sin un titulo previo
                        let safeOpcionId = currentOpcionId;
                        if(!safeOpcionId){
                            // Crear un semestre por defecto
                            const defSemId = await findOrCreate(connection, 'Semestre', 'nombre', 'Semestre Generico');
                            const [insDefOpc] = await connection.execute('INSERT INTO Opcion (id_semestre, nombre) VALUES (?, ?)', [defSemId, 'UNICA']);
                            safeOpcionId = insDefOpc.insertId;
                        }

                        const [insPub] = await connection.execute(
                            'INSERT INTO Publicacion (nrc, id_facultad, id_asignatura, id_curso, id_opcion, creditos) VALUES (?, ?, ?, ?, ?, ?)',
                            [nrc, facultadId, asigId, cursoId, safeOpcionId, creditos]
                        );
                        pubId = insPub.insertId;
                    }

                    // Procesamiento de celdas de Día en la semana
                    const mapDays = {
                        'LUN': 'Lunes', 
                        'MAR': 'Martes', 
                        'MIER': 'Miércoles', 
                        'JUEV': 'Jueves', 
                        'VIER': 'Viernes'
                        // SAB se omitirá temporalmente porque en el JSON las keys del excel son muy sueltas y 'Sábado' no esta en las cols generadas ahorita pero agreguémoslo en caso de que lo necesiten.
                    };
                    
                    // Asegurar qeu 'SÁB' o 'SAB' no crashee
                    const validDayKeys = Object.keys(row).filter(key => mapDays[key] || key.startsWith('S') && key.includes('B'));

                    for (const col of validDayKeys) {
                        if (row[col] && row[col].toString().trim() !== '') {
                            const dbDay = mapDays[col] || 'Sábado'; // LUN -> Lunes, SAB -> Sábado
                            const parsedMateriaBlock = parseScheduleStr(row[col]);
                            if (parsedMateriaBlock) {
                                const { hora_inicio, hora_fin, salon } = parsedMateriaBlock;
                                
                                // Creamos la "Materia" (Que sabemos que es el bloque de clase)
                                const [insMat] = await connection.execute(
                                    'INSERT INTO Materia (nombre, dia, hora_inicio, hora_fin, salon) VALUES (?, ?, ?, ?, ?)',
                                    [asigName, dbDay, hora_inicio, hora_fin, salon]
                                );
                                const matId = insMat.insertId;

                                // Link en la tabla intermedia
                                await connection.execute(
                                    'INSERT IGNORE INTO Publicacion_Materia (id_publicacion, id_materia) VALUES (?, ?)',
                                    [pubId, matId]
                                );
                            }
                        }
                    }
                }
            }
        }

        // Determinar ID Facultad Principal
        let globalFacultadId = null;
        if (facultadFormulario) {
            let [facs] = await connection.execute('SELECT id_facultad FROM Facultad WHERE nombre = ? OR nombre LIKE ? LIMIT 1', [facultadFormulario, `%${facultadFormulario}%`]);
            if (facs.length > 0) globalFacultadId = facs[0].id_facultad;
        }

        // Registrar la acción en Reporte
        let userId = creadorId ? parseInt(creadorId) : 1;
        let tipoPub = tipo || 'Horarios de Clases';
        let descPub = descripcion || 'Cargados mediante archivo Excel';
        let fInicio = fechaInicio || null;
        let fFin = fechaFin || null;

        await connection.execute(
            `INSERT INTO Reporte (tipo, id_facultad, disponible, id_creador, fecha_inicio, fecha_fin, descripcion, fecha_creacion, archivo_nombre) 
             VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`,
            [tipoPub, globalFacultadId, 1, userId, fInicio, fFin, descPub, fileName || 'archivo_desconocido.xlsx']
        );

        // Si se llegó a este punto, todas las consultas fueron exitosas
        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'Datos guardados exitosamente. Tu Base de Datos ya tiene los horarios del Excel.' });
    } catch (err) {
        console.error('Error in Database Transaction:', err);
        // Deshacemos todo lo ejecutado. Si falló al 99%, retrocede al 0%.
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        res.status(500).json({ success: false, message: 'Fallo al procesar el archivo Excel', error: err.message });
    }
};

exports.getHorarios = async (req, res) => {
    const { facultad } = req.query; // se espera el texto o el id
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
                m.salon
            FROM Publicacion p
            JOIN Asignatura a ON p.id_asignatura = a.id_asignatura
            JOIN Facultad f ON p.id_facultad = f.id_facultad
            JOIN Publicacion_Materia pm ON p.id_publicacion = pm.id_publicacion
            JOIN Materia m ON pm.id_materia = m.id_materia
        `;
        let params = [];
        if (facultad) {
            query += ` WHERE f.nombre = ? OR f.nombre LIKE ?`;
            // Un pequeño truco para permitir el slug
            const queryFacultad = '%' + facultad.replace(/-/g, ' ') + '%';
            params.push(facultad, queryFacultad);
        }

        const [rows] = await db.execute(query, params);

        // Agrupar por id_publicacion para construir los días
        const map = {};
        for (const r of rows) {
            if (!map[r.id_publicacion]) {
                map[r.id_publicacion] = {
                    asignatura: r.asignatura,
                    materia: r.asignatura,
                    nrc: r.nrc,
                    creditos: r.creditos,
                    profesor: "Asignado", // Pendiente tabla Profesor
                    aula: r.salon || "Por asignar",
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
        console.error('Error al obtener horarios:', error);
        res.status(500).json({ success: false, message: 'Error del servidor al obtener horarios' });
    }
};
