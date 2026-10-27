import { Router } from 'express';
import { requireApiKey } from '../middleware/requireApiKey';
import merchantsRoutes from './merchants.routes';
import paymentsRoutes from './payments.routes';
import surchargeRoutes from './surcharge.routes';

const router = Router();

router.use(requireApiKey);

router.use('/merchants', merchantsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/surcharge', surchargeRoutes);

export default router;
