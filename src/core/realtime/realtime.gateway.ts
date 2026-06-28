import { Injectable, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { auth } from '@/core/auth/auth';
import { RealtimeService } from './realtime.service';

const FRONTEND_ORIGINS = process.env.FRONTEND_URLS?.split(',').map((o) =>
  o.trim(),
) ?? ['http://localhost:3000'];

@Injectable()
@WebSocketGateway({
  cors: { origin: FRONTEND_ORIGINS, credentials: true },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  // definite assignment asserted: set by Nest after gateway init
  server!: Server;

  constructor(private readonly realtime: RealtimeService) {}

  afterInit(server: Server) {
    this.realtime.setServer(server);
    this.logger.log('WebSocket gateway initialised');
  }

  async handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      socket.disconnect();
      return;
    }

    const session = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${token}`,
      }),
    });

    if (!session?.user) {
      socket.disconnect();
      return;
    }

    socket.data.userId = session.user.id;
    await socket.join(`user:${session.user.id}`);
    this.logger.log(`Socket connected: user ${session.user.id}`);
  }
}
