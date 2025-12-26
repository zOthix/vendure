import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { Order } from '../entity';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class SocketGateway {
    @WebSocketServer()
    server: Server;

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(@MessageBody() clientId: string, @ConnectedSocket() client: Socket) {
        await client.join(clientId);
    }

    sendPaymentConfirmation(clientId: string, order: Order) {
        this.server.to(clientId).emit('paymentSuccess', { success: true, orderId: order.id });
    }

    sendPaymentError(clientId: string, message: string) {
        this.server.to(clientId).emit('paymentError', { success: false, message });
    }
}
