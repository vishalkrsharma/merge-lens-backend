import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  emitToUser(userId: string, event: string, data?: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }
}
