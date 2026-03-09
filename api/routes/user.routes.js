const express = require('express');
const router = express.Router();

const {
  registerUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  getUser,
  getUserByUserId,
  getUsersByOrganization,
  isUserActive,
  userRegistered,
  getTotalUsers,
  getActiveUsersCount
} = require('../controllers/userController');

router.get('/total', getTotalUsers);
router.get('/active/count', getActiveUsersCount);
router.get('/organization/:organization', getUsersByOrganization);
router.get('/id/:userId', getUserByUserId);

router.post('/', registerUser);
router.put('/wallet/:walletAddress', updateUser);
router.post('/wallet/:walletAddress/deactivate', deactivateUser);
router.post('/wallet/:walletAddress/reactivate', reactivateUser);
router.get('/wallet/:walletAddress/active', isUserActive);
router.get('/wallet/:walletAddress/registered', userRegistered);
router.get('/wallet/:walletAddress', getUser);

module.exports = router;