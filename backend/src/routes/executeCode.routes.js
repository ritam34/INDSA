import Router from 'express';
import { executeCode } from '../controllers/executeCode.controllers.js';

const router = Router();

router.route("/")
    .post(executeCode)

export default router;