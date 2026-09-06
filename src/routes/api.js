const express = require('express');
const router = express.Router();

const systemRoutes = require('./systemRoutes');
const dataRoutes = require('./dataRoutes');
const externalRoutes = require('./externalRoutes');
const utilityRoutes = require('./utilityRoutes');
const exportRoutes = require('./exportRoutes');

router.use('/', systemRoutes);
router.use('/', dataRoutes);
router.use('/', externalRoutes);
router.use('/', utilityRoutes);
router.use('/', exportRoutes);

module.exports = router;
