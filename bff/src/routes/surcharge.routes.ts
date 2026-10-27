import { Router } from 'express';
import * as controller from '../controllers/surcharge.controller';

const router = Router();

router.post('/quote', controller.quoteSurcharge);

export default router;
