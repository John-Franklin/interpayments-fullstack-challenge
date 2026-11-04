import { Router } from 'express';
import * as controller from '../controllers/reports.controller';

const router = Router();

router.get('/settlement', controller.fetchSettlementReport);

export default router;
