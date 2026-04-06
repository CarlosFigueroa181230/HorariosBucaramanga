const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horariosController');

// POST /api/horarios/upload
router.post('/upload', horariosController.uploadExcelData);

// GET /api/horarios
router.get('/', horariosController.getHorarios);

module.exports = router;
