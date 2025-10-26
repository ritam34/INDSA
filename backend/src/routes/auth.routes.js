import express from 'express';

import { registerUser ,loginUser ,logoutUser, getUser} from './../controllers/auth.controllers.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/user', getUser);


export default router;