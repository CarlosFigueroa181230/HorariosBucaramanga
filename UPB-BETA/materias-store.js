(function () {
    const STORAGE_KEY = 'upb_materias_v1';

    const DEFAULT_MATERIAS = [
        { id: 1, facultad: 'Ingeniería De Sistemas E Informática', escuela: 'Escuela de Sistemas e Informática', materia: 'Programación I', semestre: 1, nrc: 'SIS101', creditos: 4, fechaActualizacion: '2026-03-04' },
        { id: 2, facultad: 'Ingeniería De Sistemas E Informática', escuela: 'Escuela de Sistemas e Informática', materia: 'Bases de Datos', semestre: 2, nrc: 'SIS202', creditos: 4, fechaActualizacion: '2026-03-04' },
        { id: 3, facultad: 'Derecho', escuela: 'Escuela de Derecho', materia: 'Derecho Civil', semestre: 3, nrc: 'DER110', creditos: 3, fechaActualizacion: '2026-03-04' },
        { id: 4, facultad: 'Psicología', escuela: 'Escuela de Psicología', materia: 'Psicología General', semestre: 1, nrc: 'PSI101', creditos: 3, fechaActualizacion: '2026-03-04' }
    ];

    function limpiarTexto(valor) {
        return (valor || '').toString().trim();
    }

    function fechaActual() {
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function guardar(datos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    }

    function cargar() {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (!guardado) {
            guardar(DEFAULT_MATERIAS);
            return [...DEFAULT_MATERIAS];
        }

        try {
            const datos = JSON.parse(guardado);
            if (!Array.isArray(datos)) {
                guardar(DEFAULT_MATERIAS);
                return [...DEFAULT_MATERIAS];
            }
            return datos.map(item => ({
                ...item,
                // Compatibilidad: registros antiguos guardaban "codigo" en lugar de "nrc".
                nrc: limpiarTexto(item.nrc || item.codigo),
                semestre: Number(item.semestre) || 1
            }));
        } catch (error) {
            guardar(DEFAULT_MATERIAS);
            return [...DEFAULT_MATERIAS];
        }
    }

    function siguienteId(datos) {
        if (!datos.length) {
            return 1;
        }
        return Math.max(...datos.map(item => Number(item.id) || 0)) + 1;
    }

    function validar(payload) {
        const facultad = limpiarTexto(payload.facultad);
        const escuela = limpiarTexto(payload.escuela);
        const materia = limpiarTexto(payload.materia);
        const semestre = Number(payload.semestre);
        // Compatibilidad: aceptar payload.codigo antiguo y normalizar a nrc.
        const nrc = limpiarTexto(payload.nrc || payload.codigo);
        const creditos = Number(payload.creditos);

        if (!facultad || !escuela || !materia || !nrc) {
            return { ok: false, message: 'Facultad, escuela, materia y NRC son obligatorios.' };
        }

        if (!Number.isFinite(semestre) || semestre <= 0) {
            return { ok: false, message: 'Semestre debe ser un número mayor a 0.' };
        }

        if (!Number.isFinite(creditos) || creditos <= 0) {
            return { ok: false, message: 'Créditos debe ser un número mayor a 0.' };
        }

        return {
            ok: true,
            data: {
                facultad,
                escuela,
                materia,
                semestre,
                nrc,
                creditos
            }
        };
    }

    function existeDuplicado(datos, payload, idExcluir) {
        return datos.some(item => {
            if (idExcluir && Number(item.id) === Number(idExcluir)) {
                return false;
            }

            return item.facultad.toLowerCase() === payload.facultad.toLowerCase()
                && item.escuela.toLowerCase() === payload.escuela.toLowerCase()
                && item.materia.toLowerCase() === payload.materia.toLowerCase()
                && Number(item.semestre) === Number(payload.semestre);
        });
    }

    function create(payload) {
        const validacion = validar(payload);
        if (!validacion.ok) {
            return validacion;
        }

        const datos = cargar();
        if (existeDuplicado(datos, validacion.data)) {
            return { ok: false, message: 'La materia ya existe para esa facultad y escuela.' };
        }

        const nuevo = {
            id: siguienteId(datos),
            ...validacion.data,
            fechaActualizacion: fechaActual()
        };

        datos.push(nuevo);
        guardar(datos);
        return { ok: true, data: nuevo };
    }

    function update(id, payload) {
        const validacion = validar(payload);
        if (!validacion.ok) {
            return validacion;
        }

        const datos = cargar();
        const indice = datos.findIndex(item => Number(item.id) === Number(id));
        if (indice === -1) {
            return { ok: false, message: 'No se encontró la materia.' };
        }

        if (existeDuplicado(datos, validacion.data, id)) {
            return { ok: false, message: 'La materia ya existe para esa facultad y escuela.' };
        }

        datos[indice] = {
            ...datos[indice],
            ...validacion.data,
            fechaActualizacion: fechaActual()
        };

        guardar(datos);
        return { ok: true, data: datos[indice] };
    }

    function getAll() {
        return cargar().slice().sort((a, b) => Number(a.id) - Number(b.id));
    }

    function getById(id) {
        return getAll().find(item => Number(item.id) === Number(id)) || null;
    }

    window.MateriasStore = {
        getAll,
        getById,
        create,
        update
    };
})();
