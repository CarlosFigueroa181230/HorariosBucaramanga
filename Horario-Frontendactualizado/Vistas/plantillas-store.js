(function () {
    const STORAGE_KEY = 'upb_plantillas';

    const DEFAULT_PLANTILLAS = [
        {
            id: 1,
            tipo: 'Horarios',
            facultad: 'Ingeniería',
            escuela: 'Escuela de Sistemas e Informática',
            asignatura: 'Programación I',
            materia: 'Lenguajes de Programación',
            semestre: 1,
            nrc: '12345',
            creditos: 4,
            profesor: 'Dr. García',
            aula: 'Lab 101',
            cupos: 30,
            lun: '',
            mar: '',
            mier: '',
            juev: '',
            vier: '',
            sabad: ''
        },
        {
            id: 2,
            tipo: 'Horarios',
            facultad: 'Ingeniería',
            escuela: 'Escuela de Sistemas e Informática',
            asignatura: 'Bases de Datos',
            materia: 'Sistemas de Bases de Datos',
            semestre: 2,
            nrc: '12346',
            creditos: 4,
            profesor: 'Ing. López',
            aula: 'Lab 102',
            cupos: 25,
            lun: '',
            mar: '',
            mier: '',
            juev: '',
            vier: '',
            sabad: ''
        },
        {
            id: 3,
            tipo: 'Horarios',
            facultad: 'Derecho',
            escuela: 'Escuela de Derecho',
            asignatura: 'Derecho Civil',
            materia: 'Obligaciones',
            semestre: 3,
            nrc: '54321',
            creditos: 3,
            profesor: 'Abg. Martínez',
            aula: 'Aula 201',
            cupos: 40,
            lun: '',
            mar: '',
            mier: '',
            juev: '',
            vier: '',
            sabad: ''
        }
    ];

    function limpiarTexto(valor) {
        return (valor || '').toString().trim();
    }

    function cargar() {
        const guardado = localStorage.getItem(STORAGE_KEY);
        if (!guardado) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTILLAS));
            return [...DEFAULT_PLANTILLAS];
        }

        try {
            const datos = JSON.parse(guardado);
            if (!Array.isArray(datos)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTILLAS));
                return [...DEFAULT_PLANTILLAS];
            }
            return datos.map(item => ({
                ...item,
                tipo: limpiarTexto(item.tipo) || 'Horarios',
                escuela: limpiarTexto(item.escuela),
                semestre: Number(item.semestre) || 1,
                lun: limpiarTexto(item.lun),
                mar: limpiarTexto(item.mar),
                mier: limpiarTexto(item.mier),
                juev: limpiarTexto(item.juev),
                vier: limpiarTexto(item.vier),
                sabad: limpiarTexto(item.sabad)
            }));
        } catch (error) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLANTILLAS));
            return [...DEFAULT_PLANTILLAS];
        }
    }

    function guardar(datos) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
    }

    function getAll() {
        return cargar().slice().sort((a, b) => Number(a.id) - Number(b.id));
    }

    function getById(id) {
        return getAll().find(item => Number(item.id) === Number(id)) || null;
    }

    function siguienteId(datos) {
        if (!datos.length) {
            return 1;
        }
        return Math.max(...datos.map(item => Number(item.id) || 0)) + 1;
    }

    function validar(payload) {
        const tipo = limpiarTexto(payload.tipo) || 'Horarios';
        const facultad = limpiarTexto(payload.facultad);
        const escuela = limpiarTexto(payload.escuela);
        const asignatura = limpiarTexto(payload.asignatura);
        const materia = limpiarTexto(payload.materia);
        const semestre = Number(payload.semestre);
        const nrc = limpiarTexto(payload.nrc);
        const profesor = limpiarTexto(payload.profesor);
        const aula = limpiarTexto(payload.aula);
        const creditos = Number(payload.creditos);
        const cupos = Number(payload.cupos);
        const lun = limpiarTexto(payload.lun);
        const mar = limpiarTexto(payload.mar);
        const mier = limpiarTexto(payload.mier);
        const juev = limpiarTexto(payload.juev);
        const vier = limpiarTexto(payload.vier);
        const sabad = limpiarTexto(payload.sabad);

        const tiposPermitidos = ['Horarios', 'Examenes', 'Supletorios', 'Intersemestrales'];

        if (!tiposPermitidos.includes(tipo)) {
            return { ok: false, message: 'Tipo de plantilla no válido.' };
        }

        if (!facultad || !escuela || !asignatura || !materia || !nrc || !profesor || !aula) {
            return { ok: false, message: 'Todos los campos son obligatorios.' };
        }

        if (!Number.isFinite(semestre) || semestre <= 0) {
            return { ok: false, message: 'Semestre debe ser un número válido mayor a 0.' };
        }

        if (!Number.isFinite(creditos) || creditos <= 0) {
            return { ok: false, message: 'Los créditos deben ser un número válido mayor a 0.' };
        }

        if (!Number.isFinite(cupos) || cupos <= 0) {
            return { ok: false, message: 'Los cupos deben ser un número válido mayor a 0.' };
        }

        return {
            ok: true,
            data: {
                tipo,
                facultad,
                escuela,
                asignatura,
                materia,
                semestre,
                nrc,
                creditos,
                profesor,
                aula,
                cupos,
                lun,
                mar,
                mier,
                juev,
                vier,
                sabad
            }
        };
    }

    function update(id, payload) {
        const validacion = validar(payload);
        if (!validacion.ok) {
            return validacion;
        }

        const datos = cargar();
        const indice = datos.findIndex(item => Number(item.id) === Number(id));
        if (indice === -1) {
            return { ok: false, message: 'No se encontró la plantilla.' };
        }

        datos[indice] = {
            ...datos[indice],
            ...validacion.data
        };

        guardar(datos);
        return { ok: true, data: datos[indice] };
    }

    function create(payload) {
        const validacion = validar(payload);
        if (!validacion.ok) {
            return validacion;
        }

        const datos = cargar();
        const nuevo = {
            id: siguienteId(datos),
            ...validacion.data
        };

        datos.push(nuevo);
        guardar(datos);
        return { ok: true, data: nuevo };
    }

    function remove(id) {
        const datos = cargar();
        const indice = datos.findIndex(item => Number(item.id) === Number(id));
        if (indice === -1) {
            return { ok: false, message: 'No se encontró la plantilla.' };
        }

        const eliminado = datos.splice(indice, 1)[0];
        guardar(datos);
        return { ok: true, data: eliminado };
    }

    window.PlantillasStore = {
        getAll,
        getById,
        create,
        update,
        remove
    };
})();
