/**
 * Shared UI Manager
 * Handles Loading States, Standardized Fetching, and Logging
 */
window.UIManager = (function () {
    // Inject Overlay into DOM if not present
    function ensureLoader() {
        if (document.getElementById('global-loader')) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'global-loader';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text" id="loader-message">Procesando...</div>
        `;
        document.body.appendChild(overlay);
    }

    function showLoader(message = 'Procesando...') {
        ensureLoader();
        const loader = document.getElementById('global-loader');
        const msgEl = document.getElementById('loader-message');
        msgEl.textContent = message;
        loader.classList.add('active');
    }

    function hideLoader() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.remove('active');
    }

    /**
     * Standardized Fetch with Robust Error Handling and Logging
     */
    async function apiFetch(url, options = {}) {
        const startTime = Date.now();
        const method = options.method || 'GET';
        
        console.group(`🚀 [API] ${method} ${url}`);
        console.log('📦 Solicitud iniciada:', { options, timestamp: new Date().toISOString() });

        try {
            const response = await fetch(url, options);
            const duration = Date.now() - startTime;
            
            console.log(`📡 Respuesta recibida (${duration}ms):`, { 
                status: response.status, 
                ok: response.ok 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error del servidor (${response.status})`);
            }

            const result = await response.json();
            console.log('🎁 Datos procesados:', result);
            console.groupEnd();
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`❌ Error en la petición (${duration}ms):`, error.message);
            console.groupEnd();
            throw error;
        }
    }

    /**
     * Slugify a string for safe use in CSS classes or IDs
     */
    function slugify(text) {
        return (text || '')
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD') // Remove accents
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
            .replace(/(^-|-$)/g, '');    // Remove leading/trailing hyphens
    }

    // Public API
    return {
        showLoader,
        hideLoader,
        apiFetch,
        slugify
    };
})();
