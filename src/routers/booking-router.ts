import { Router } from 'express';
import { authenticateToken } from '@/middlewares';
import { getBooking, createBooking, editBooking } from '@/controllers/booking-controller';

const bookingRouter = Router();

bookingRouter.all('/*', authenticateToken).get('/', getBooking);
bookingRouter.all('/*', authenticateToken).post('/', createBooking);
bookingRouter.all('/*', authenticateToken).put('/:bookingId', editBooking);

export { bookingRouter };
