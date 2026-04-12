(function () {
    function normalizar(valor) {
        return (valor || '')
            .toString()
            .trim()
            .toLowerCase();
    }

    function slugify(texto) {
        return normalizar(texto)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    window.aplicarFacultadesEnSelect = function (selectId, placeholderTexto) {
        const select = document.getElementById(selectId);
        if (!select || !window.FacultadesStore || typeof window.FacultadesStore.getAll !== 'function') {
            return;
        }

        const datos = window.FacultadesStore.getAll();
        const opcionesActuales = Array.from(select.options);
        const valorActual = select.value;
        const valorPorEtiqueta = {};
        const etiquetasBase = [];

        opcionesActuales.forEach(function (opcion) {
            const etiqueta = normalizar(opcion.textContent);
            if (etiqueta && opcion.value) {
                valorPorEtiqueta[etiqueta] = opcion.value;
                etiquetasBase.push(opcion.textContent.trim());
            }
        });

        const facultadesStore = Array.from(new Set(datos.map(item => item.facultad).filter(Boolean)));

        const etiquetasCombinadas = [];
        const agregadas = new Set();

        etiquetasBase.forEach(function (nombre) {
            const clave = normalizar(nombre);
            if (!clave || agregadas.has(clave)) {
                return;
            }
            agregadas.add(clave);
            etiquetasCombinadas.push(nombre);
        });

        facultadesStore.forEach(function (nombre) {
            const clave = normalizar(nombre);
            if (!clave || agregadas.has(clave)) {
                return;
            }
            agregadas.add(clave);
            etiquetasCombinadas.push(nombre);
        });

        select.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = placeholderTexto || '--Seleccionar facultad--';
        select.appendChild(placeholder);

        etiquetasCombinadas.forEach(function (nombre) {
            const opcion = document.createElement('option');
            const clave = normalizar(nombre);
            opcion.value = valorPorEtiqueta[clave] || slugify(nombre);
            opcion.textContent = nombre;
            select.appendChild(opcion);
        });

        const existeValor = Array.from(select.options).some(function (opcion) {
            return opcion.value === valorActual;
        });

        if (existeValor) {
            select.value = valorActual;
        }
    };
})();
