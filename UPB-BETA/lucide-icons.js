(function () {
    function iconByLabel(label, fallback) {
        const text = (label || '').toLowerCase();

        if (text.includes('horarios clases')) return 'calendar-days';
        if (text.includes('exámenes') || text.includes('examenes')) return 'file-text';
        if (text.includes('supletorios')) return 'clipboard-check';
        if (text.includes('intersemestrales')) return 'calendar-plus';
        if (text.includes('mi información') || text.includes('mi informacion')) return 'user-round';
        if (text.includes('cambiar contraseña') || text.includes('cambiar contrase')) return 'key-round';
        if (text.includes('administración') || text.includes('administracion')) return 'settings';
        if (text.includes('logout')) return 'log-out';
        if (text.includes('login')) return 'log-in';
        if (text.includes('crear publicacion')) return 'file-plus-2';
        if (text.includes('ver publicaciones')) return 'files';
        if (text.includes('facultades y escuelas')) return 'school';
        if (text.includes('plantilla')) return 'sheet';
        if (text.includes('edicion plantilla')) return 'file-pen-line';
        if (text.includes('materias')) return 'book-open-text';
        return fallback || 'circle';
    }

    function renderIconInElement(element, iconName) {
        if (!element) {
            return;
        }

        const originalClass = element.className || '';
        element.innerHTML = `<i data-lucide="${iconName}" class="${originalClass} lucide-replaced"></i>`;
    }

    function applyIconReplacements() {
        document.querySelectorAll('.submenu-icon').forEach(function (element) {
            const label = element.parentElement ? element.parentElement.textContent : element.textContent;
            renderIconInElement(element, iconByLabel(label, 'chevron-right'));
        });

        document.querySelectorAll('.icon').forEach(function (element) {
            const label = element.parentElement ? element.parentElement.textContent : element.textContent;
            renderIconInElement(element, iconByLabel(label, 'dot'));
        });

        document.querySelectorAll('.card-icon').forEach(function (element) {
            const card = element.closest('.process-card');
            const label = card ? card.textContent : element.textContent;
            renderIconInElement(element, iconByLabel(label, 'sparkles'));
        });

        document.querySelectorAll('.welcome-icon').forEach(function (element) {
            renderIconInElement(element, 'bell-ring');
        });

        document.querySelectorAll('.avatar-placeholder').forEach(function (element) {
            renderIconInElement(element, 'user-round');
        });
    }

    function styleLucideIcons() {
        document.querySelectorAll('.lucide-replaced').forEach(function (icon) {
            if (icon.closest('.card-icon')) {
                icon.setAttribute('width', '28');
                icon.setAttribute('height', '28');
                icon.setAttribute('stroke-width', '2.1');
            } else if (icon.closest('.welcome-icon')) {
                icon.setAttribute('width', '26');
                icon.setAttribute('height', '26');
                icon.setAttribute('stroke-width', '2.1');
            } else if (icon.closest('.avatar-placeholder')) {
                icon.setAttribute('width', '50');
                icon.setAttribute('height', '50');
                icon.setAttribute('stroke-width', '2');
            } else {
                icon.setAttribute('width', '16');
                icon.setAttribute('height', '16');
                icon.setAttribute('stroke-width', '2');
            }
        });
    }

    function initLucideIcons() {
        applyIconReplacements();

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
            styleLucideIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLucideIcons);
    } else {
        initLucideIcons();
    }
})();
