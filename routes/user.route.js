const express = require('express');
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');

// calling Router function of express
const router = express.Router();

// Signup, Login, Logout routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Forgot & Reset password routes
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// Adding a piece of middleware for rest of the code: Login is required for below routes
router.use(authController.protect);

// Change/Update password route
router.patch('/updateMyPassword', authController.updatePassword);

// Update current in user's information route
router.patch('/updateMe', userController.updateMe);

// Resticted to admin only for below routes
router.use(authController.restrictTo('ADMIN'));

// Getting all users
router.get('/allUsers', userController.getAllUsers);

// Getting a single user
router.get('/allUsers/:id', userController.getUser);

// User role update
router.patch('/updateRole/:id', userController.updateRole);

// Delete current user's account route
router.delete('/deleteMe', userController.deleteMe);

module.exports = router;
