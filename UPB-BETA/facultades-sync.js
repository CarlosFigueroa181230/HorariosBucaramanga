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

    window.aplicarFacultadesEnSelect = async function (selectId, placeholderTexto) {
        const select = document.getElementById(selectId);
        if (!select) {
            return;
        }

        const valorActual = select.value;

        try {
            const response = await fetch('http://localhost:3000/api/facultades');
            const data = await response.json();

            if (data.success && data.facultades) {
                select.innerHTML = '';

                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = placeholderTexto || '--Seleccionar facultad--';
                select.appendChild(placeholder);

                // Asegurar valores únicos
                const agregadas = new Set();

                data.facultades.forEach(item => {
                    const nombre = item.facultad;
                    const clave = normalizar(nombre);
                    
                    if (!clave || agregadas.has(clave)) {
                        return;
                    }
                    agregadas.add(clave);
                    
                    const opcion = document.createElement('option');
                    // Mantenemos la compatibilidad con el slug para los formularios/vistas que lo usan
                    opcion.value = slugify(nombre);
                    opcion.textContent = nombre;
                    select.appendChild(opcion);
                });

                // Restaurar el valor si aún existe en las nuevas opciones
                const existeValor = Array.from(select.options).some(opcion => opcion.value === valorActual);
                if (existeValor) {
                    select.value = valorActual;
                }
            }
        } catch (error) {
            console.error('Error cargando facultades desde la BD:', error);
        }
    };
})();
