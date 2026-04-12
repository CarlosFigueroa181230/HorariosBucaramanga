(function () {
    const STORAGE_KEY = 'upb_facultades_v4';

    const DEFAULT_FACULTADES = [
        { id: 1, facultad: 'Administración De Empresas', escuela: 'Escuela de Administración y Negocios', fechaActualizacion: '2026-03-04' },
        { id: 2, facultad: 'Centro De Lenguas', escuela: 'Escuela de Idiomas y Lenguas Modernas', fechaActualizacion: '2026-03-04' },
        { id: 3, facultad: 'Ciencias Políticas Y Gobierno', escuela: 'Escuela de Gobierno y Relaciones Institucionales', fechaActualizacion: '2026-03-04' },
        { id: 4, facultad: 'Comunicación Social - Periodismo', escuela: 'Escuela de Comunicación y Medios', fechaActualizacion: '2026-03-04' },
        { id: 5, facultad: 'Departamento De Ciencias Básicas', escuela: 'Escuela de Ciencias Básicas', fechaActualizacion: '2026-03-04' },
        { id: 6, facultad: 'Departamento De Formación Humanística', escuela: 'Escuela de Humanidades y Formación Integral', fechaActualizacion: '2026-03-04' },
        { id: 7, facultad: 'Derecho', escuela: 'Escuela de Derecho', fechaActualizacion: '2026-03-04' },
        { id: 8, facultad: 'Diseño Gráfico', escuela: 'Escuela de Diseño y Creatividad', fechaActualizacion: '2026-03-04' },
        { id: 9, facultad: 'Electivas', escuela: 'Escuela de Cursos Electivos', fechaActualizacion: '2026-03-04' },
        { id: 10, facultad: 'Ingenieria Industrial', escuela: 'Escuela de Ingeniería Industrial', fechaActualizacion: '2026-03-04' },
        { id: 11, facultad: 'Ingeniería Ambiental', escuela: 'Escuela de Ingeniería Ambiental', fechaActualizacion: '2026-03-04' },
        { id: 12, facultad: 'Ingeniería Civil', escuela: 'Escuela de Ingeniería Civil', fechaActualizacion: '2026-03-04' },
        { id: 13, facultad: 'Ingeniería Electrónica', escuela: 'Escuela de Ingeniería Electrónica', fechaActualizacion: '2026-03-04' },
        { id: 14, facultad: 'Ingeniería Eléctrica', escuela: 'Escuela de Ingeniería Eléctrica', fechaActualizacion: '2026-03-04' },
        { id: 15, facultad: 'Ingeniería Mecánica', escuela: 'Escuela de Ingeniería Mecánica', fechaActualizacion: '2026-03-04' },
        { id: 16, facultad: 'Ingeniería De Sistemas E Informática', escuela: 'Escuela de Sistemas e Informática', fechaActualizacion: '2026-03-04' },
        { id: 17, facultad: 'Negocios Internacionales', escuela: 'Escuela de Negocios Internacionales', fechaActualizacion: '2026-03-04' },
        { id: 18, facultad: 'Psicología', escuela: 'Escuela de Psicología', fechaActualizacion: '2026-03-04' }
    ];

    function normalizarTexto(valor) {
        return (valor || '').trim();
    }

    function obtenerFechaActual() {
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
            guardar(DEFAULT_FACULTADES);
            return [...DEFAULT_FACULTADES];
        }

        try {
            const datos = JSON.parse(guardado);
            if (!Array.isArray(datos)) {
                guardar(DEFAULT_FACULTADES);
                return [...DEFAULT_FACULTADES];
            }
            return datos;
        } catch (error) {
            guardar(DEFAULT_FACULTADES);
            return [...DEFAULT_FACULTADES];
        }
    }

    function obtenerSiguienteId(datos) {
        if (!datos.length) {
            return 1;
        }
        return Math.max(...datos.map(item => Number(item.id) || 0)) + 1;
    }

    function existeDuplicado(datos, facultad, escuela, idExcluir) {
        const facultadLc = facultad.toLowerCase();
        const escuelaLc = escuela.toLowerCase();

        return datos.some(item => {
            if (idExcluir && Number(item.id) === Number(idExcluir)) {
                return false;
            }

            const facItem = normalizarTexto(item.facultad).toLowerCase();
            const escItem = normalizarTexto(item.escuela).toLowerCase();
            return facItem === facultadLc && escItem === escuelaLc;
        });
    }

    function crearFacultad(payload) {
        const facultad = normalizarTexto(payload.facultad);
        const escuela = normalizarTexto(payload.escuela);

        if (!facultad || !escuela) {
            return { ok: false, message: 'Debe ingresar la facultad y la escuela.' };
        }

        const datos = cargar();
        if (existeDuplicado(datos, facultad, escuela)) {
            return { ok: false, message: 'La combinación de facultad y escuela ya existe.' };
        }

        const nuevo = {
            id: obtenerSiguienteId(datos),
            facultad,
            escuela,
            fechaActualizacion: obtenerFechaActual()
        };

        datos.push(nuevo);
        guardar(datos);

        return { ok: true, data: nuevo };
    }

    function actualizarFacultad(id, payload) {
        const facultad = normalizarTexto(payload.facultad);
        const escuela = normalizarTexto(payload.escuela);

        if (!facultad || !escuela) {
            return { ok: false, message: 'Debe ingresar la facultad y la escuela.' };
        }

        const datos = cargar();
        const indice = datos.findIndex(item => Number(item.id) === Number(id));
        if (indice === -1) {
            return { ok: false, message: 'No se encontró la facultad a editar.' };
        }

        if (existeDuplicado(datos, facultad, escuela, id)) {
            return { ok: false, message: 'La combinación de facultad y escuela ya existe.' };
        }

        datos[indice] = {
            ...datos[indice],
            facultad,
            escuela,
            fechaActualizacion: obtenerFechaActual()
        };

        guardar(datos);
        return { ok: true, data: datos[indice] };
    }

    function obtenerTodas() {
        return cargar()
            .slice()
            .sort((a, b) => Number(a.id) - Number(b.id));
    }

    function obtenerPorId(id) {
        return obtenerTodas().find(item => Number(item.id) === Number(id)) || null;
    }

    function obtenerEscuelasPorFacultad(nombreFacultad) {
        const objetivo = normalizarTexto(nombreFacultad).toLowerCase();
        return obtenerTodas()
            .filter(item => normalizarTexto(item.facultad).toLowerCase() === objetivo)
            .map(item => item.escuela)
            .filter((escuela, index, arr) => arr.indexOf(escuela) === index);
    }

    window.FacultadesStore = {
        getAll: obtenerTodas,
        getById: obtenerPorId,
        getSchoolsByFaculty: obtenerEscuelasPorFacultad,
        create: crearFacultad,
        update: actualizarFacultad
    };
})();
