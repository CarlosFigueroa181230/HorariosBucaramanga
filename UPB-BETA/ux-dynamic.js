(function () {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timings = {
        fast: 260,
        normal: 420,
        slow: 620,
        verySlow: 900
    };

    function animateElement(element, keyframes, options) {
        if (!element || reduceMotion || typeof element.animate !== 'function') {
            return;
        }
        element.animate(keyframes, options);
    }

    function animateOpen(target) {
        if (!target) {
            return;
        }

        if (target.classList.contains('submenu')) {
            animateElement(target, [
                { opacity: 0, transform: 'translateY(-14px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], {
                duration: timings.slow,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });

            const items = target.querySelectorAll('li');
            items.forEach(function (item, index) {
                animateElement(item, [
                    { opacity: 0, transform: 'translateX(-8px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                ], {
                    duration: timings.normal,
                    delay: index * 60,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both'
                });
            });
            return;
        }

        if (target.classList.contains('dropdown-menu')) {
            animateElement(target, [
                { opacity: 0, transform: 'translateY(-14px) scale(0.97)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], {
                duration: timings.normal,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });

            target.querySelectorAll('a').forEach(function (link, index) {
                animateElement(link, [
                    { opacity: 0, transform: 'translateX(8px)' },
                    { opacity: 1, transform: 'translateX(0)' }
                ], {
                    duration: timings.normal,
                    delay: index * 45,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both'
                });
            });
            return;
        }

        if (target.classList.contains('modal')) {
            animateElement(target, [
                { opacity: 0 },
                { opacity: 1 }
            ], {
                duration: timings.normal,
                easing: 'ease-out'
            });

            const modalContent = target.querySelector('.modal-content');
            animateElement(modalContent, [
                { opacity: 0, transform: 'translateY(20px) scale(0.97)' },
                { opacity: 1, transform: 'translateY(0) scale(1)' }
            ], {
                duration: timings.slow,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
            });
        }
    }

    function addDynamicStyleLayer() {
        if (document.getElementById('ux-dynamic-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'ux-dynamic-styles';
        style.textContent = `
            .menu-toggle,
            .menu-list li,
            .dropdown-content a,
            .dropdown-admin a,
            .btn-action,
            .btn-buscar,
            .btn-limpiar,
            .btn-guardar,
            .btn-actualizar,
            .back-button {
                transition: transform .35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow .35s ease, background-color .35s ease, color .35s ease;
            }

            .menu-list li:hover,
            .dropdown-content a:hover,
            .dropdown-admin a:hover {
                transform: translateX(4px);
            }

            .table-wrapper,
            .consulta-card,
            .publication-form,
            .welcome-box,
            .card,
            .process-card {
                transition: transform .4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow .4s ease;
            }

            .table-wrapper:hover,
            .consulta-card:hover,
            .publication-form:hover {
                transform: translateY(-4px);
                box-shadow: 0 16px 30px rgba(0,0,0,.12);
            }

            .btn-action:hover,
            .btn-buscar:hover,
            .btn-limpiar:hover,
            .btn-guardar:hover,
            .btn-actualizar:hover,
            .back-button:hover {
                transform: translateY(-2px) scale(1.01);
                box-shadow: 0 8px 18px rgba(0,0,0,.16);
            }

            .btn-action:active,
            .btn-buscar:active,
            .btn-limpiar:active,
            .btn-guardar:active,
            .btn-actualizar:active,
            .back-button:active {
                transform: translateY(0) scale(0.985);
            }

            .page-btn,
            .table-link {
                transition: transform .3s ease, color .3s ease, background-color .3s ease;
            }

            .page-btn:hover,
            .table-link:hover {
                transform: translateY(-1px);
            }

            @keyframes uxSoftPulse {
                0%, 100% { box-shadow: 0 0 0 rgba(169, 20, 20, 0); }
                50% { box-shadow: 0 0 0 8px rgba(169, 20, 20, 0.08); }
            }

            .welcome-box,
            .content-header h2 {
                animation: uxSoftPulse 6s ease-in-out infinite;
            }
        `;

        document.head.appendChild(style);
    }

    function observeDisplayChanges() {
        const candidates = document.querySelectorAll('.submenu, .modal, .dropdown-menu');

        const observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.type === 'attributes' && (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    const element = mutation.target;
                    const isVisible = window.getComputedStyle(element).display !== 'none';

                    if (!isVisible) {
                        return;
                    }

                    if (element.classList.contains('dropdown-menu') && !element.classList.contains('active')) {
                        return;
                    }

                    animateOpen(element);
                }
            });
        });

        candidates.forEach(function (node) {
            observer.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
        });
    }

    function animateInitialLayout() {
        const header = document.querySelector('.header');
        const sidebar = document.querySelector('.sidebar');
        const content = document.querySelector('.content, .inner-content');

        animateElement(header, [
            { opacity: 0, transform: 'translateY(-12px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: timings.slow,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
        });

        animateElement(sidebar, [
            { opacity: 0, transform: 'translateX(-14px)' },
            { opacity: 1, transform: 'translateX(0)' }
        ], {
            duration: timings.verySlow,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
        });

        animateElement(content, [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: timings.verySlow,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both'
        });
    }

    function animateTableRowsOnChange() {
        if (reduceMotion) {
            return;
        }

        const tbodies = document.querySelectorAll('tbody');
        tbodies.forEach(function (tbody) {
            const observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    mutation.addedNodes.forEach(function (node, index) {
                        if (node.nodeType !== 1 || node.tagName !== 'TR') {
                            return;
                        }

                        animateElement(node, [
                            { opacity: 0, transform: 'translateY(8px)' },
                            { opacity: 1, transform: 'translateY(0)' }
                        ], {
                            duration: timings.normal,
                            delay: index * 35,
                            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                            fill: 'both'
                        });
                    });
                });
            });

            observer.observe(tbody, { childList: true });
        });
    }

    function animateEntryCards() {
        if (reduceMotion || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const items = document.querySelectorAll('.process-card, .card, .table-wrapper, .consulta-card, .publication-form');
        if (!items.length) {
            return;
        }

        const io = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) {
                    return;
                }

                animateElement(entry.target, [
                    { opacity: 0, transform: 'translateY(14px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ], {
                    duration: timings.slow,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
                });

                observer.unobserve(entry.target);
            });
        }, { threshold: 0.15 });

        items.forEach(function (item) {
            io.observe(item);
        });
    }

    function ensureHorarioPersonalizadoLinks() {
        const submenuLists = document.querySelectorAll('.submenu');
        submenuLists.forEach(function (submenu) {
            const exists = submenu.querySelector('li[onclick*="consultas-horario-personalizado.html"]');
            if (exists) {
                return;
            }

            const item = document.createElement('li');
            item.setAttribute('onclick', "irA('consultas-horario-personalizado.html')");
            item.innerHTML = '<span class="submenu-icon">🧩</span> Horario Personalizado';
            submenu.appendChild(item);
        });

        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(function (dropdown) {
            const exists = dropdown.querySelector('a[href="consultas-horario-personalizado.html"]');
            if (exists) {
                return;
            }

            const link = document.createElement('a');
            link.href = 'consultas-horario-personalizado.html';
            link.innerHTML = '<span class="icon">🧩</span> Horario Personalizado';
            dropdown.appendChild(link);
        });
    }

    function initDynamicUX() {
        ensureHorarioPersonalizadoLinks();
        addDynamicStyleLayer();
        animateInitialLayout();
        observeDisplayChanges();
        animateTableRowsOnChange();
        animateEntryCards();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDynamicUX);
    } else {
        initDynamicUX();
    }
})();
