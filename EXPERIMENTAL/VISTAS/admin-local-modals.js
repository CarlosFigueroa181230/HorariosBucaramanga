(function () {
    function ensureModalStyles() {
        if (document.getElementById('admin-local-modal-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'admin-local-modal-styles';
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 2000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                align-items: center;
                justify-content: center;
            }
            .modal-content {
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                width: 90%;
                max-width: 400px;
                animation: slideInLocal 0.3s ease-out;
            }
            @keyframes slideInLocal {
                from {
                    transform: translateY(-50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
            }
            .modal-header h2 {
                margin: 0;
                color: #333333;
                font-size: 20px;
            }
            .modal-close {
                background: none;
                border: none;
                font-size: 28px;
                cursor: pointer;
                color: #999999;
                transition: color 0.2s;
            }
            .modal-close:hover {
                color: #333333;
            }
            .modal-body {
                padding: 20px;
            }
            .form-group {
                margin-bottom: 16px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                color: #333333;
                font-weight: 600;
                font-size: 14px;
            }
            .form-group input {
                width: 100%;
                padding: 10px 12px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
                transition: border-color 0.2s;
            }
            .form-group input:focus {
                outline: none;
                border-color: #a91414;
                box-shadow: 0 0 0 3px rgba(169, 20, 20, 0.1);
            }
            .form-group input:readonly {
                background-color: #f5f5f5;
                cursor: not-allowed;
            }
            .mensaje-error {
                padding: 12px;
                margin-bottom: 16px;
                border-radius: 4px;
                background-color: #fadbd8;
                color: #e74c3c;
                font-size: 14px;
                text-align: center;
                display: none;
            }
            .mensaje-exito {
                padding: 12px;
                margin-bottom: 16px;
                border-radius: 4px;
                background-color: #d5f4e6;
                color: #27ae60;
                font-size: 14px;
                text-align: center;
                display: none;
            }
            .modal-footer {
                display: flex;
                gap: 12px;
                padding: 16px 20px;
                border-top: 1px solid #e0e0e0;
                justify-content: flex-end;
            }
            .btn-cancelar {
                padding: 10px 24px;
                background-color: #e0e0e0;
                color: #333333;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                transition: background-color 0.2s;
            }
            .btn-cancelar:hover {
                background-color: #d0d0d0;
            }
            .btn-guardar {
                padding: 10px 24px;
                background-color: #a91414;
                color: #ffffff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                transition: background-color 0.2s;
            }
            .btn-guardar:hover {
                background-color: #8a0f0f;
            }
            .btn-editar {
                padding: 10px 24px;
                background-color: #28a745;
                color: #ffffff;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 600;
                transition: background-color 0.2s;
            }
            .btn-editar:hover {
                background-color: #218838;
            }
            .modal-info {
                max-width: 500px;
            }
            .info-container {
                display: flex;
                gap: 24px;
            }
            .info-avatar {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                flex-shrink: 0;
            }
            .avatar-placeholder {
                width: 120px;
                height: 120px;
                border-radius: 50%;
                background: linear-gradient(135deg, #a91414 0%, #8a0f0f 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                color: #ffffff;
                box-shadow: 0 4px 12px rgba(169, 20, 20, 0.2);
            }
            .info-details {
                flex: 1;
            }
            .info-group {
                margin-bottom: 14px;
            }
            .info-group:last-child {
                margin-bottom: 0;
            }
            .info-group label {
                display: block;
                font-weight: 600;
                color: #666666;
                font-size: 12px;
                margin-bottom: 4px;
                text-transform: uppercase;
            }
            .info-group p {
                margin: 0;
                color: #333333;
                font-size: 14px;
                font-weight: 500;
            }
        `;

        document.head.appendChild(style);
    }

    function getProfileData() {
        const session = window.getAdminSession ? window.getAdminSession() : null;
        const username = session && session.username ? session.username : 'Administrador del Sistema';

        return {
            nombre: username,
            email: 'admin@upb.edu.bo',
            rol: 'Administrador del Sistema',
            departamento: 'Tecnología de Información',
            telefono: '+591 2 2700123 ext. 456',
            ultimaConexion: 'Hoy, 14:32'
        };
    }

    function ensureModals() {
        if (document.getElementById('modalCambiarContrasenaLocal')) {
            return;
        }

        const profile = getProfileData();

        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
            <div id="modalCambiarContrasenaLocal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Cambiar Contraseña</h2>
                        <button class="modal-close" onclick="cerrarModalCambiarContraseña()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="formCambiarContrasenaLocal" onsubmit="guardarCambioContrasenaLocal(event)">
                            <div class="form-group">
                                <label for="contrasenaActualLocal">Contraseña Actual:</label>
                                <input type="password" id="contrasenaActualLocal" required placeholder="Ingrese su contraseña actual">
                            </div>
                            <div class="form-group">
                                <label for="contrasenaNuevaLocal">Contraseña Nueva:</label>
                                <input type="password" id="contrasenaNuevaLocal" required placeholder="Ingrese su nueva contraseña">
                            </div>
                            <div class="form-group">
                                <label for="contrasenaConfirmarLocal">Confirmar Contraseña:</label>
                                <input type="password" id="contrasenaConfirmarLocal" required placeholder="Confirme su nueva contraseña">
                            </div>
                            <div id="mensajeContrasenaLocal" class="mensaje-error" style="display: none;"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn-cancelar" onclick="cerrarModalCambiarContraseña()">Cancelar</button>
                                <button type="submit" class="btn-guardar">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div id="modalInfoAdminLocal" class="modal" style="display: none;">
                <div class="modal-content modal-info">
                    <div class="modal-header">
                        <h2>Mi Información</h2>
                        <button class="modal-close" onclick="cerrarModalInfoAdmin()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="info-container">
                            <div class="info-avatar">
                                <div class="avatar-placeholder">👤</div>
                            </div>
                            <div class="info-details">
                                <div class="info-group">
                                    <label>Nombre Completo:</label>
                                    <p id="infoNombreLocal">${profile.nombre}</p>
                                </div>
                                <div class="info-group">
                                    <label>Email:</label>
                                    <p id="infoEmailLocal">${profile.email}</p>
                                </div>
                                <div class="info-group">
                                    <label>Rol:</label>
                                    <p id="infoRolLocal">${profile.rol}</p>
                                </div>
                                <div class="info-group">
                                    <label>Departamento:</label>
                                    <p id="infoDepartamentoLocal">${profile.departamento}</p>
                                </div>
                                <div class="info-group">
                                    <label>Teléfono:</label>
                                    <p id="infoTelefonoLocal">${profile.telefono}</p>
                                </div>
                                <div class="info-group">
                                    <label>Última conexión:</label>
                                    <p id="infoUltimaConexionLocal">${profile.ultimaConexion}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-cancelar" onclick="cerrarModalInfoAdmin()">Cerrar</button>
                        <button type="button" class="btn-editar" onclick="abrirEdicionAdmin()">Editar</button>
                    </div>
                </div>
            </div>

            <div id="modalEditarAdminLocal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Editar Mi Información</h2>
                        <button class="modal-close" onclick="cerrarModalEditarAdmin()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="formEditarAdminLocal" onsubmit="guardarEdicionAdminLocal(event)">
                            <div class="form-group">
                                <label for="editNombreLocal">Nombre Completo:</label>
                                <input type="text" id="editNombreLocal" required placeholder="Nombre completo">
                            </div>
                            <div class="form-group">
                                <label for="editEmailLocal">Email:</label>
                                <input type="email" id="editEmailLocal" required placeholder="Correo electrónico">
                            </div>
                            <div class="form-group">
                                <label for="editRolLocal">Rol:</label>
                                <input type="text" id="editRolLocal" required placeholder="Rol en el sistema" readonly>
                            </div>
                            <div class="form-group">
                                <label for="editDepartamentoLocal">Departamento:</label>
                                <input type="text" id="editDepartamentoLocal" required placeholder="Departamento">
                            </div>
                            <div class="form-group">
                                <label for="editTelefonoLocal">Teléfono:</label>
                                <input type="tel" id="editTelefonoLocal" required placeholder="Teléfono">
                            </div>
                            <div id="mensajeEditarErrorLocal" class="mensaje-error" style="display: none;"></div>
                            <div id="mensajeEditarExitoLocal" class="mensaje-exito" style="display: none;"></div>
                            <div class="modal-footer">
                                <button type="button" class="btn-cancelar" onclick="cerrarModalEditarAdmin()">Cancelar</button>
                                <button type="submit" class="btn-guardar">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        while (wrapper.firstChild) {
            document.body.appendChild(wrapper.firstChild);
        }
    }

    function closeDropdownMenu() {
        const menu = document.getElementById('dropdownMenu');
        if (menu) {
            menu.classList.remove('active');
        }
    }

    window.abrirModalInfoAdmin = function (event) {
        if (event) {
            event.preventDefault();
        }
        ensureModalStyles();
        ensureModals();
        closeDropdownMenu();
        document.getElementById('modalInfoAdminLocal').style.display = 'flex';
    };

    window.cerrarModalInfoAdmin = function () {
        const modal = document.getElementById('modalInfoAdminLocal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.abrirModalCambiarContraseña = function (event) {
        if (event) {
            event.preventDefault();
        }
        ensureModalStyles();
        ensureModals();
        closeDropdownMenu();
        document.getElementById('modalCambiarContrasenaLocal').style.display = 'flex';
    };

    window.cerrarModalCambiarContraseña = function () {
        const modal = document.getElementById('modalCambiarContrasenaLocal');
        const form = document.getElementById('formCambiarContrasenaLocal');
        const msg = document.getElementById('mensajeContrasenaLocal');

        if (form) {
            form.reset();
        }
        if (msg) {
            msg.style.display = 'none';
            msg.textContent = '';
            msg.style.color = '#e74c3c';
            msg.style.backgroundColor = '#fadbd8';
        }
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.abrirEdicionAdmin = function () {
        ensureModalStyles();
        ensureModals();

        document.getElementById('editNombreLocal').value = document.getElementById('infoNombreLocal').textContent;
        document.getElementById('editEmailLocal').value = document.getElementById('infoEmailLocal').textContent;
        document.getElementById('editRolLocal').value = document.getElementById('infoRolLocal').textContent;
        document.getElementById('editDepartamentoLocal').value = document.getElementById('infoDepartamentoLocal').textContent;
        document.getElementById('editTelefonoLocal').value = document.getElementById('infoTelefonoLocal').textContent;

        document.getElementById('mensajeEditarErrorLocal').style.display = 'none';
        document.getElementById('mensajeEditarExitoLocal').style.display = 'none';

        document.getElementById('modalInfoAdminLocal').style.display = 'none';
        document.getElementById('modalEditarAdminLocal').style.display = 'flex';
    };

    window.cerrarModalEditarAdmin = function () {
        const modal = document.getElementById('modalEditarAdminLocal');
        const form = document.getElementById('formEditarAdminLocal');

        if (modal) {
            modal.style.display = 'none';
        }
        if (form) {
            form.reset();
        }
        document.getElementById('mensajeEditarErrorLocal').style.display = 'none';
        document.getElementById('mensajeEditarExitoLocal').style.display = 'none';
    };

    window.guardarEdicionAdminLocal = function (event) {
        event.preventDefault();

        const nombre = document.getElementById('editNombreLocal').value.trim();
        const email = document.getElementById('editEmailLocal').value.trim();
        const departamento = document.getElementById('editDepartamentoLocal').value.trim();
        const telefono = document.getElementById('editTelefonoLocal').value.trim();
        const mensajeError = document.getElementById('mensajeEditarErrorLocal');
        const mensajeExito = document.getElementById('mensajeEditarExitoLocal');

        if (!nombre || nombre.length < 3) {
            mensajeError.textContent = '❌ El nombre debe tener al menos 3 caracteres.';
            mensajeError.style.display = 'block';
            return;
        }

        if (!email.includes('@')) {
            mensajeError.textContent = '❌ Por favor ingrese un email válido.';
            mensajeError.style.display = 'block';
            return;
        }

        if (!departamento || departamento.length < 3) {
            mensajeError.textContent = '❌ El departamento debe tener al menos 3 caracteres.';
            mensajeError.style.display = 'block';
            return;
        }

        if (!telefono || telefono.length < 7) {
            mensajeError.textContent = '❌ El teléfono debe ser válido.';
            mensajeError.style.display = 'block';
            return;
        }

        document.getElementById('infoNombreLocal').textContent = nombre;
        document.getElementById('infoEmailLocal').textContent = email;
        document.getElementById('infoDepartamentoLocal').textContent = departamento;
        document.getElementById('infoTelefonoLocal').textContent = telefono;

        mensajeError.style.display = 'none';
        mensajeExito.textContent = '✓ Información actualizada exitosamente.';
        mensajeExito.style.display = 'block';

        setTimeout(function () {
            window.cerrarModalEditarAdmin();
            document.getElementById('modalInfoAdminLocal').style.display = 'flex';
        }, 1500);
    };

    window.guardarCambioContrasenaLocal = function (event) {
        event.preventDefault();

        const actual = document.getElementById('contrasenaActualLocal').value;
        const nueva = document.getElementById('contrasenaNuevaLocal').value;
        const confirma = document.getElementById('contrasenaConfirmarLocal').value;
        const msg = document.getElementById('mensajeContrasenaLocal');

        if (nueva !== confirma) {
            msg.textContent = '❌ Las contraseñas no coinciden.';
            msg.style.display = 'block';
            return;
        }

        if (actual === nueva) {
            msg.textContent = '❌ La nueva contraseña no puede ser igual a la actual.';
            msg.style.display = 'block';
            return;
        }

        if (nueva.length < 6) {
            msg.textContent = '❌ La contraseña debe tener al menos 6 caracteres.';
            msg.style.display = 'block';
            return;
        }

        msg.textContent = '✓ Contraseña cambiada exitosamente.';
        msg.style.display = 'block';
        msg.style.color = '#27ae60';
        msg.style.backgroundColor = '#d5f4e6';

        setTimeout(function () {
            window.cerrarModalCambiarContraseña();
        }, 1500);
    };

    window.addEventListener('click', function (event) {
        const modalPass = document.getElementById('modalCambiarContrasenaLocal');
        const modalInfo = document.getElementById('modalInfoAdminLocal');
        const modalEdit = document.getElementById('modalEditarAdminLocal');

        if (modalPass && event.target === modalPass) {
            window.cerrarModalCambiarContraseña();
        }
        if (modalInfo && event.target === modalInfo) {
            window.cerrarModalInfoAdmin();
        }
        if (modalEdit && event.target === modalEdit) {
            window.cerrarModalEditarAdmin();
        }
    });
})();
