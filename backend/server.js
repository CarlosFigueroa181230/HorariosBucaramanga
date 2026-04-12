const express = require('express');
const cors = require('cors');
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

// POST /api/login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y Contraseña son requeridos' });
    }

    try {
        // Query the database securely using prepared statements to prevent SQL Injection
        const [rows] = await db.execute(
            'SELECT id_usuario, usuario, rol FROM Usuario WHERE usuario = ? AND contrasena = ?',
            [username, password]
        );

        if (rows.length > 0) {
            // Un usuario coincide
            const userData = rows[0];
            res.json({
                success: true,
                message: 'Login exitoso',
                user: {
                    id: userData.id_usuario,
                    username: userData.usuario,
                    role: userData.rol
                }
            });
        } else {
            // Nadie coincide con el usuario y contraseña
            res.status(401).json({ success: false, message: 'Credenciales inválidas, usuario o contraseña incorrectos' });
        }
    } catch (error) {
        console.error('Error ejecutando login query:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el login' });
    }
});

// Routes middleware
app.use('/api/horarios', horariosRoutes);
app.use('/api/facultades', facultadesRoutes);
app.use('/api/reportes', reportesRoutes);

const https = require('https');
const fs = require('fs');
const path = require('path');

// Cargar certificados SSL
const privateKey = fs.readFileSync(path.join(__dirname, 'security', 'server.key'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, 'security', 'server.cert'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Start the server
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
    console.log(`🚀 Backend server is running on https://localhost:${PORT}`);
});
