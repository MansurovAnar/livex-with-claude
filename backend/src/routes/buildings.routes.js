const router = require('express').Router();
const ctrl = require('../controllers/buildings.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));
router.get('/', ctrl.listBuildings);
router.post('/', ctrl.createBuilding);
router.get('/:id/rooms', ctrl.listRooms);
router.post('/:id/rooms', ctrl.createRoom);
router.put('/rooms/:id', ctrl.updateRoom);

module.exports = router;
