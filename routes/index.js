const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/UsersController');
const AppController = require('../controllers/AppController');

router.post('/users', UsersController.postNew);
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

module.exports = router;
