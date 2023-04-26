import { prisma } from '@/config';

async function findRoomById(id: number) {
  return prisma.room.findFirst({
    where: {
      id,
    },
  });
}

const roomRepository = {
  findRoomById,
};

export default roomRepository;
