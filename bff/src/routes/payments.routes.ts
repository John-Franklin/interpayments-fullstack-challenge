import { Router } from 'express';
import * as controller from '../controllers/payments.controller';

const router = Router();

router.get('/', controller.fetchPayments);

router.post('/', controller.createPayment);

router.get('/:id', controller.fetchPayment);

router.post('/:id/refund', controller.refundPayment);

export default router;
