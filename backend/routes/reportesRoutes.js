const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

// Obtener todas las publicaciones (reportes de archivos subidos)
router.get('/', reportesController.getReportes);

module.exports = router;
