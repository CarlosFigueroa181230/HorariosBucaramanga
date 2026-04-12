(function () {
    const STORAGE_KEY = 'upb_cursos_extracurriculares_v1';

    const DEFAULT_CURSOS = [
        {
            id: 1,
            tipo: 'Deportivas',
            asignatura: 'Futbol Formativo',
            nrc: 'DEP101',
            instructor: 'Carlos Rojas',
            cupos: 25,
            horarioSemanal: 'Lunes y Miércoles 18:00 - 20:00',
            salon: 'Coliseo A',
            fechaActualizacion: '2026-04-10'
        },
        {
            id: 2,
            tipo: 'Culturales',
            asignatura: 'Taller de Teatro',
            nrc: 'CUL202',
            instructor: 'Ana Ruiz',
            cupos: 20,
            horarioSemanal: 'Martes y Jueves 17:00 - 19:00',
            salon: 'Auditorio B',
            fechaActualizacion: '2026-04-10'
        },
        {
            id: 3,
            tipo: 'Pastorales',
            asignatura: 'Coro Universitario',
            nrc: 'PAS303',
            instructor: 'Luis Medina',
            cupos: 30,
            horarioSemanal: 'Viernes 16:00 - 19:00',
            salon: 'Capilla Central',
            fechaActualizacion: '2026-04-10'
        }
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
            guardar(DEFAULT_CURSOS);
            return [...DEFAULT_CURSOS];
        }

        try {
            const datos = JSON.parse(guardado);
            if (!Array.isArray(datos)) {
                guardar(DEFAULT_CURSOS);
                return [...DEFAULT_CURSOS];
            }
            return datos.map(item => {
                const tipoNormalizado = limpiarTexto(item.tipo).toLowerCase();
                let tipo = 'Deportivas';

                if (tipoNormalizado === 'culturales') {
                    tipo = 'Culturales';
                } else if (tipoNormalizado === 'pastorales') {
                    tipo = 'Pastorales';
                } else if (tipoNormalizado === 'deportivas') {
                    tipo = 'Deportivas';
                }

                return {
                    ...item,
                    tipo,
                    asignatura: limpiarTexto(item.asignatura || item.actividad),
                    nrc: limpiarTexto(item.nrc),
                    instructor: limpiarTexto(item.instructor),
                    horarioSemanal: limpiarTexto(item.horarioSemanal || item.lunesViernes || item.horario),
                    salon: limpiarTexto(item.salon)
                };
            });
        } catch (error) {
            guardar(DEFAULT_CURSOS);
            return [...DEFAULT_CURSOS];
        }
    }

    function siguienteId(datos) {
        if (!datos.length) {
            return 1;
        }
        return Math.max(...datos.map(item => Number(item.id) || 0)) + 1;
    }

    function validar(payload) {
        const tipoRaw = limpiarTexto(payload.tipo).toLowerCase();
        let tipo = '';
        if (tipoRaw === 'deportivas') {
            tipo = 'Deportivas';
        } else if (tipoRaw === 'culturales') {
            tipo = 'Culturales';
        } else if (tipoRaw === 'pastorales') {
            tipo = 'Pastorales';
        }

        const asignatura = limpiarTexto(payload.asignatura || payload.actividad);
        const nrc = limpiarTexto(payload.nrc);
        const instructor = limpiarTexto(payload.instructor);
        const cupos = Number(payload.cupos);
        const horarioSemanal = limpiarTexto(payload.horarioSemanal || payload.lunesViernes || payload.horario);
        const salon = limpiarTexto(payload.salon);

        if (!tipo || !asignatura || !nrc || !instructor || !horarioSemanal || !salon) {
            return { ok: false, message: 'Tipo, asignatura, NRC, instructor, horario semanal y salón son obligatorios.' };
        }

        if (!Number.isFinite(cupos) || cupos <= 0) {
            return { ok: false, message: 'Cupos debe ser un número mayor a 0.' };
        }

        return {
            ok: true,
            data: {
                tipo,
                asignatura,
                nrc,
                instructor,
                cupos
                ,
                horarioSemanal,
                salon
            }
        };
    }

    function existeDuplicadoNrc(datos, nrc, idExcluir) {
        return datos.some(item => {
            if (idExcluir && Number(item.id) === Number(idExcluir)) {
                return false;
            }

            return limpiarTexto(item.nrc).toLowerCase() === limpiarTexto(nrc).toLowerCase();
        });
    }

    function create(payload) {
        const validacion = validar(payload);
        if (!validacion.ok) {
            return validacion;
        }

        const datos = cargar();
        if (existeDuplicadoNrc(datos, validacion.data.nrc)) {
            return { ok: false, message: 'Ya existe un curso extracurricular con ese NRC.' };
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
            return { ok: false, message: 'No se encontró el curso extracurricular.' };
        }

        if (existeDuplicadoNrc(datos, validacion.data.nrc, id)) {
            return { ok: false, message: 'Ya existe un curso extracurricular con ese NRC.' };
        }

        datos[indice] = {
            ...datos[indice],
            ...validacion.data,
            fechaActualizacion: fechaActual()
        };

        guardar(datos);
        return { ok: true, data: datos[indice] };
    }

    function getByNrc(nrc) {
        const clave = limpiarTexto(nrc).toLowerCase();
        return getAll().find(item => limpiarTexto(item.nrc).toLowerCase() === clave) || null;
    }

    function updateByNrc(nrcOriginal, payload) {
        const curso = getByNrc(nrcOriginal);
        if (!curso) {
            return { ok: false, message: 'No se encontró el curso extracurricular.' };
        }
        return update(curso.id, payload);
    }

    function getAll() {
        return cargar().slice().sort((a, b) => Number(a.id) - Number(b.id));
    }

    function getById(id) {
        return getAll().find(item => Number(item.id) === Number(id)) || null;
    }

    window.CursosExtracurricularesStore = {
        getAll,
        getById,
        getByNrc,
        create,
        update,
        updateByNrc
    };
})();
