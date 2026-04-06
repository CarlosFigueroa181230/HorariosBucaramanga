const express = require('express');
const router = express.Router();
const facultadesController = require('../controllers/facultadesController');

// Obtener lista de facultades
router.get('/', facultadesController.getFacultades);

module.exports = router;
