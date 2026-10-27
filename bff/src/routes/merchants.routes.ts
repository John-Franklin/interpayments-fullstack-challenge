import { Router } from 'express';
import * as controller from '../controllers/merchants.controller';

const router = Router();

router.get('/me', controller.fetchMerchant);

export default router;
