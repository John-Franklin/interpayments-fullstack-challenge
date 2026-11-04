import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as controller from '../controllers/merchants.controller';

const router = Router();

router.get('/me', asyncHandler(controller.fetchMerchant));

export default router;
