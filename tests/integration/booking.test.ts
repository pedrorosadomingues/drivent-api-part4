import faker from '@faker-js/faker';
import httpStatus from 'http-status';
import * as jwt from 'jsonwebtoken';
import supertest from 'supertest';
import { TicketStatus } from '.prisma/client';
import {
  createEnrollmentWithAddress,
  createUser,
  createTicketTypeWithHotel,
  createTicketTypeRemoteWithHotel,
  createTicketTypeWithoutHotel,
  createTicket,
  createPayment,
  createHotel,
  createRoomWithHotelId,
  createBooking,
  createRoomCapacity2,
} from '../factories';
import { cleanDb, generateValidToken, findBookingById } from '../helpers';
import app, { init } from '@/app';

beforeAll(async () => {
  await init();
});

beforeEach(async () => {
  await cleanDb();
});

const server = supertest(app);

describe('GET /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.get('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe('when token is valid', () => {
    it('should respond with status 404 when user has no bookings', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);

      const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
    it('should respond with status 200 and list booking when user has booking', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const payment = await createPayment(ticket.id, ticketType.price);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual([
        {
          id: createdBooking.id,
          Room: {},
        },
      ]);
    });
  });
});

describe('POST /booking', () => {
  it('should respond with status 401 if no token is given', async () => {
    const response = await server.get('/booking');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.get('/booking').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe('when token is valid', () => {
    it('should respond with status 403 if ticket status is not PAID', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it('should respond with status 403 if ticketType is remote', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemoteWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it('should respond with status 403 if ticketType has no hotel', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithoutHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it('should respond with 404 if room does not exist', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: 999,
      });
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
    it('should respond with 403 if room capacity is exceeded', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it('should respond with 403 user has no enrollment', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it('should respond with 200 and create booking', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });

      const insertedBooking = await findBookingById(response.body.bookingId);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: insertedBooking.id });
    });
  });
});
describe('PUT /booking/:bookingId', () => {
  it('should respond with status 401 if there is no token', async () => {
    const response = await server.put('/booking/1');

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if given token is not valid', async () => {
    const token = faker.lorem.word();

    const response = await server.put('/booking/1').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it('should respond with status 401 if there is no session for given token', async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

    const response = await server.put('/booking/1').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe('when token is valid', () => {
    it('should respond with 404 if room does not exist', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.post('/booking').set('Authorization', `Bearer ${token}`).send({
        roomId: 999,
      });
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });

    it('should respond with 403 if room capacity is exceeded', async () => {
      const user = await createUser();
      const user2 = await createUser();
      const token = await generateValidToken(user2);
      const enrollment = await createEnrollmentWithAddress(user);
      const enrollment2 = await createEnrollmentWithAddress(user2);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const ticket2 = await createTicket(enrollment2.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);
      const createdBooking2 = await createBooking(user2.id, createdRoom2.id);

      const response = await server.put(`/booking/${createdBooking2.id}`).set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it('should respond with 403 if user has no booking', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);

      const response = await server.put(`/booking/1`).set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it('should respond with 403 if user has no enrollment', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.put(`/booking/${createdBooking.id}`).set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });

    it('should respond with 200 and update booking', async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomCapacity2(createdHotel.id);
      const createdBooking = await createBooking(user.id, createdRoom.id);

      const response = await server.put(`/booking/${createdBooking.id}`).set('Authorization', `Bearer ${token}`).send({
        roomId: createdRoom.id,
      });

      const updatedBooking = await findBookingById(createdBooking.id);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body.id).toEqual(updatedBooking.id);
    });
  });
});
