const express = require('express');
const cors = require('cors');
const ldap = require('ldapjs');
require('dotenv').config();

const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json()); // Parse JSON bodies

// Rutas adicionales
const horariosRoutes = require('./routes/horariosRoutes');
const facultadesRoutes = require('./routes/facultadesRoutes');
const reportesRoutes = require('./routes/reportesRoutes');

// Basic checking endpoint
app.get('/api/status', (req, res) => {
    res.json({ status: 'API is running successfully' });
});

// ─── Helper: autenticar usuario contra el LDAP de la UPB ─────────────────────
function authenticateWithLDAP(username, password) {
    return new Promise((resolve, reject) => {
        const client = ldap.createClient({
            url: process.env.LDAP_URL,          // ldap://10.146.36.100:389
            timeout: 5000,
            connectTimeout: 5000,
        });

        // Manejar errores de conexión (servidor inaccesible, etc.)
        client.on('error', (err) => {
            client.destroy();
            reject(err);
        });

        // El bind usa el formato usuario@dominio (UPN style)
        const userPrincipal = `${username}@${process.env.LDAP_DOMAIN}`; // e.g. juan@bga.upb

        client.bind(userPrincipal, password, (err) => {
            client.unbind(); // Siempre liberar la conexión

            if (err) {
                // InvalidCredentialsError => usuario o clave incorrectos
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

// POST /api/login endpoint — autenticación LDAP UPB
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y Contraseña son requeridos' });
    }

    try {
        await authenticateWithLDAP(username, password);

        // Bind exitoso: el usuario existe en el Active Directory de la UPB
        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                username: username,
                role: 'admin'   // Todos los que pasen el LDAP son admins UPB
            }
        });

    } catch (err) {
        const isInvalidCredentials =
            err.name === 'InvalidCredentialsError' ||
            (err.code !== undefined && err.code === 49);

        if (isInvalidCredentials) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas: usuario o contraseña incorrectos'
            });
        }

        // Error de red / servidor LDAP no disponible
        console.error('Error de conexión LDAP:', err.message);
        return res.status(503).json({
            success: false,
            message: 'No se pudo conectar al servidor LDAP de la UPB. Verifica la red institucional.'
        });
    }
});

// Routes middleware
app.use('/api/horarios', horariosRoutes);
app.use('/api/facultades', facultadesRoutes);
app.use('/api/reportes', reportesRoutes);

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Backend server is running on http://localhost:${PORT}`);
    console.log(`🔐 LDAP auth → ${process.env.LDAP_URL} (dominio: ${process.env.LDAP_DOMAIN})`);
});

