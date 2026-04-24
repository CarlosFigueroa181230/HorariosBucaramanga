/**
 * BRIDGE SCRIPT para BACKUPB FRONT
 * Conecta la versión antigua del frontend con el backend actual sin modificar los archivos originales.
 */

(function () {
    console.log('🚀 Legacy Bridge activado: Conectando maqueta antigua con base de datos real...');

    // Función auxiliar para quitar acentos y normalizar texto
    function slugify(text) {
        return (text || '')
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();
    }

    // 1. Sincronizar FacultadesStore con el Backend
    async function syncFacultades() {
        if (!window.FacultadesStore) return;
        try {
            const response = await fetch('/api/facultades');
            const result = await response.json();
            if (result.success && result.facultades) {
                // El store antiguo guarda en localStorage. Lo actualizamos.
                const datosFormateados = result.facultades.map(f => ({
                    id: f.id,
                    facultad: f.nombre,
                    escuela: f.escuela || 'N/A',
                    fechaActualizacion: new Date().toISOString().split('T')[0]
                }));
                localStorage.setItem('upb_facultades_v4', JSON.stringify(datosFormateados));
                console.log('✅ Facultades sincronizadas desde el servidor.');
                
                // Forzar repoblamiento del select si existe la función
                if (window.aplicarFacultadesEnSelect) {
                    window.aplicarFacultadesEnSelect('facultad', '---Seleccionar facultad---');
                }
            }
        } catch (e) {
            console.error('❌ Error sincronizando facultades:', e);
        }
    }

    // 2. Monkey Patching para buscarDatos()
    const originalBuscarDatos = window.buscarDatos;
    window.buscarDatos = async function() {
        const facultadSelect = document.getElementById('facultad');
        if (!facultadSelect || !facultadSelect.value) {
             if (originalBuscarDatos) originalBuscarDatos();
             return;
        }

        const facultadTexto = facultadSelect.options[facultadSelect.selectedIndex].text;
        console.log(`🔍 Interceptando búsqueda real para: ${facultadTexto}`);

        try {
            const resultadosMostrados = document.getElementById('resultados');
            if (resultadosMostrados) resultadosMostrados.textContent = 'Cargando datos desde el servidor SQL...';

            const tipo = window.location.pathname.includes('examenes') ? 'examenes' : 
                         window.location.pathname.includes('supletorios') ? 'supletorios' :
                         window.location.pathname.includes('intersemestrales') ? 'intersemestrales' :
                         window.location.pathname.includes('extracurriculares') ? 'extracurriculares' : 'horarios';

            const response = await fetch(`/api/horarios?tipo=${tipo}&facultad=${encodeURIComponent(facultadTexto)}`);
            const result = await response.json();

            if (result.success && (result.horarios || result.data)) {
                let rawData = result.horarios || result.data || [];
                
                // Normalización inteligente para el Front antiguo
                const ordenSemestres = {
                    'PRIMER': 1, 'SEGUNDO': 2, 'TERCER': 3, 'CUARTO': 4, 'QUINTO': 5,
                    'SEXTO': 6, 'SEPTIMO': 7, 'OCTAVO': 8, 'NOVENO': 9, 'DECIMO': 10
                };

                const data = rawData.map(item => {
                    let sem = 1;
                    const nivelNorm = slugify(item.nivel || item.semestre || '');
                    
                    // 1. Extraer número de semestre buscando palabras clave sin acentos
                    for (const [word, num] of Object.entries(ordenSemestres)) {
                        if (nivelNorm.includes(word)) {
                            sem = num;
                            break;
                        }
                    }
                    if (sem === 1) {
                        const match = nivelNorm.match(/\d+/);
                        if (match) sem = parseInt(match[0], 10);
                    }

                    // 2. Normalización de campos para compatibilidad con el front antiguo
                    return { 
                        ...item, 
                        semestre: sem, 
                        // El front antiguo usa localeCompare, por lo que campos críticos deben ser Strings
                        materia: String(item.materia || ''),
                        asignatura: String(item.asignatura || ''),
                        profesor: String(item.profesor || 'Asignado'),
                        creditos: Number(item.creditos) || 0,
                        cupos: Number(item.cupos) || 0
                    };
                });

                // Sincronizar con el estado interno que espera el código antiguo
                if (window.estadoConsultaHorarios) {
                    window.estadoConsultaHorarios.datos = data;
                }

                // Llamar a las funciones de renderizado originales del archivo
                if (window.renderizarTablaHorarios) {
                    window.renderizarTablaHorarios(data);
                }
                if (window.poblarFiltroSemestre) {
                    window.poblarFiltroSemestre(data);
                }
                if (window.actualizarEncabezadoHorarios) {
                    window.actualizarEncabezadoHorarios(data);
                }

                document.getElementById('results-header').style.display = 'block';
                if (window.mostrarFiltros) window.mostrarFiltros(true);
                
                console.log('✅ Datos reales cargados y mapeados (Accent-Insensitive).');
            } else {
                if (resultadosMostrados) resultadosMostrados.textContent = 'No hay datos para esta facultad en el servidor.';
            }
        } catch (e) {
            console.error('❌ Error en búsqueda bridge:', e);
            alert('Error al conectar con el servidor SQL.');
        }
    };

    // Inicialización
    document.addEventListener('DOMContentLoaded', () => {
        syncFacultades();
    });

})();
