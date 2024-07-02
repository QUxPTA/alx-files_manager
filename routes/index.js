const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/UsersController');
const AppController = require('../controllers/AppController');
const AuthController = require('../controllers/AuthController');

router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

module.exports = router;
