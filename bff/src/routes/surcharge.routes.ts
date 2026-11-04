import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as controller from '../controllers/surcharge.controller';

const router = Router();

router.post('/quote', asyncHandler(controller.quoteSurcharge));

export default router;
