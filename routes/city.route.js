const express = require('express');
const cityController = require('../controllers/city.controller');
const authController = require('../controllers/auth.controller');

// calling Router function of express
const router = express.Router();

// Login is required
router.use(authController.protect);

router.route('/').get(cityController.getCities).post(cityController.addCity);

router
  .route('/:id')
  .get(cityController.getCity)
  .patch(cityController.updateCity)
  .delete(cityController.deleteCity);

module.exports = router;
