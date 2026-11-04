import { Router } from 'express';
import { requireApiKey } from '../middleware/requireApiKey';
import merchantsRoutes from './merchants.routes';
import paymentsRoutes from './payments.routes';
import reportsRoutes from './reports.routes';
import surchargeRoutes from './surcharge.routes';

const router = Router();

router.use(requireApiKey);

router.use('/merchants', merchantsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/surcharge', surchargeRoutes);

export default router;
