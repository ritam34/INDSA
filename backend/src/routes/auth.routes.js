import express from 'express';

import { registerUser ,loginUser ,logoutUser, getUser} from './../controllers/auth.controllers.js';

const router = express.Router();

router.post('/register', registerUser);


export default router;