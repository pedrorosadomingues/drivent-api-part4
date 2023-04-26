import { Router } from 'express';
import { authenticateToken } from '@/middlewares';
import { getBooking, createBooking } from '@/controllers/booking-controller';

const bookingRouter = Router();

bookingRouter.all('/*', authenticateToken).get('/', getBooking);
bookingRouter.all('/*', authenticateToken).post('/', createBooking);

export { bookingRouter };
