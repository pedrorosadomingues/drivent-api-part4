import { notFoundError } from '../../errors/not-found-error';
import { forbiddenError } from '../../errors/forbidden-error';
import bookingRepository from '@/repositories/booking-repository';
import roomRepository from '@/repositories/room-repository';
import enrollmentRepository from '@/repositories/enrollment-repository';
import ticketsRepository from '@/repositories/tickets-repository';

async function getBooking(userId: number) {
  const booking = await bookingRepository.findBookingByUserId(userId);
  if (!booking) {
    throw notFoundError();
  }
  const response = [
    {
      id: booking.id,
      Room: {},
    },
  ];
  return response;
}

async function validateTicketUser(userId: number) {
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
  const ticket = await ticketsRepository.findTicketByEnrollmentId(enrollment.id);
  const ticketType = await ticketsRepository.findTicketTypeById(ticket.ticketTypeId);

  if (ticketType.isRemote || !ticketType.includesHotel || ticket.status !== 'PAID') throw forbiddenError();
}

async function createBooking(roomId: number, userId: number) {
  await validateTicketUser(userId);
  const room = await roomRepository.findRoomById(roomId);

  if (!room) throw notFoundError();

  const findBookingsByRoomId = await bookingRepository.findAllBookingsByRoomId(roomId);

  console.log(room, findBookingsByRoomId);

  if (findBookingsByRoomId.length === room.capacity) throw forbiddenError();

  const booking = await bookingRepository.createBooking(roomId, userId);

  return booking;
}

const bookingService = {
  getBooking,
  createBooking,
};

export default bookingService;