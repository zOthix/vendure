import { Injectable } from '@nestjs/common';
import { NotificationBody } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import Expo, {
    ExpoPushErrorReceipt,
    ExpoPushMessage,
    ExpoPushSuccessTicket,
    ExpoPushTicket,
    ExpoPushToken,
} from 'expo-server-sdk';

import { RequestContext } from '../../api';
import { TransactionalConnection } from '../../connection';
import { Customer } from '../../entity';

import { NotificationTokenService } from './notification-token.service';

/**
 * @description
 * Contains methods relating to {@link PushNotification} entities.
 *
 * @docsCategory services
 */

type ExpoPushSuccessTicketWithToken = ExpoPushSuccessTicket & { expoPushToken: string };
type ExpoPushTicketWithToken = ExpoPushTicket & { expoPushToken: string };

const expo = new Expo({
    accessToken: process.env.EXPO_ACCESS_TOKEN,
    useFcmV1: true,
});

@Injectable()
export class NotificationService {
    constructor(
        private connection: TransactionalConnection,
        private notificationTokenService: NotificationTokenService,
    ) {}

    /**
     * Sends notifications to customerIds if available or
     * sends notifications to all registered tokens
     * @param ctx
     * @param customerIds
     * @returns Boolean value indicating success
     */
    async sendNotification(
        ctx: RequestContext,
        notificationBody: NotificationBody,
        customerIds?: ID[],
        priceVariant?: ID,
        categories?: ID[],
        noOrderCustomers?: boolean,
    ): Promise<boolean> {
        try {
            let pushTokens: ExpoPushToken[] = [];
            if (!customerIds && !priceVariant && !categories) {
                const pushTokenObjects = await this.notificationTokenService.getAllNotificationTokens(ctx);
                pushTokens = pushTokenObjects.map(token => token.token);
            } else {
                const qb = this.connection.rawConnection
                    .getRepository(Customer)
                    .createQueryBuilder('customer')
                    .leftJoinAndSelect('customer.priceVariant', 'priceVariant')
                    .leftJoinAndSelect('customer.category', 'category')
                    .leftJoinAndSelect('customer.pushToken', 'pushToken')
                    .leftJoinAndSelect('customer.orders', 'order');
                if (customerIds && customerIds.length > 0) {
                    qb.where('customer.id IN (:...customerIds)', { customerIds });
                }
                if (priceVariant) {
                    qb.orWhere('priceVariant.id = :priceVariantId', { priceVariantId: priceVariant });
                }
                if (categories) {
                    qb.orWhere('category.id IN (:...categoryIds)', {
                        categoryIds: categories,
                    });
                }
                if (noOrderCustomers) {
                    qb.orWhere('order.id IS NULL');
                }
                const customers = await qb.getMany();
                pushTokens = customers.map(customer => customer.pushToken?.token ?? '');
            }
            if (pushTokens.length <= 0) {
                throw new Error('No push tokens');
            }
            const messages: ExpoPushMessage[] = pushTokens
                .filter(token => Expo.isExpoPushToken(token))
                .map(validToken => ({
                    to: validToken,
                    sound: 'default',
                    badge: 1,
                    title: notificationBody.title,
                    subtitle: notificationBody.subtitle,
                    body: notificationBody.body,
                }));
            const tickets = await this.sendPushNotifications(ctx, messages);
            const receiptIds = tickets.map(ticket => ({
                id: ticket.id,
                expoPushToken: ticket.expoPushToken,
            }));
            setTimeout(
                async () => {
                    await this.handleNotificationReceipts(ctx, receiptIds);
                },
                15 * 60 * 1000,
            );
            return true;
        } catch (e: any) {
            return false;
        }
    }

    private async handleNotificationErrors(
        ctx: RequestContext,
        receipt: ExpoPushErrorReceipt,
        expoPushToken: string,
    ) {
        switch (receipt.details?.error) {
            case 'DeviceNotRegistered':
                await this.notificationTokenService.deleteNotificationToken(ctx, expoPushToken);
                break;
            case 'MessageTooBig':
                throw new Error('Message size is too big');
            case 'MessageRateExceeded':
                throw new Error('Message rate is exceeded');
            default:
                return;
        }
    }

    private async sendPushNotifications(
        ctx: RequestContext,
        messages: ExpoPushMessage[],
    ): Promise<ExpoPushSuccessTicketWithToken[]> {
        const tickets: ExpoPushTicketWithToken[] = [];
        /**
         * Chunk the push notification messages before sending
         * so that there isn't much load sending multiple
         * messages that are to be sent.
         */
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            // Send the notifications using expo
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            ticketChunk.forEach((ticket, index) =>
                tickets.push({ ...ticket, expoPushToken: messages[index].to as string }),
            );
        }
        return tickets.filter(ticket => ticket.status === 'ok');
    }

    private async handleNotificationReceipts(
        ctx: RequestContext,
        receiptsWithToken: Array<{ id: string; expoPushToken: string }>,
    ) {
        /**
         * First we chunk the receipt ids as to avoid a
         * single api call for a single id. Reducing load
         * on the server.
         */
        const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptsWithToken.map(rec => rec.id));
        for (const chunk of receiptIdChunks) {
            // At this point we get the receipts
            const receiptsChunk = await expo.getPushNotificationReceiptsAsync(chunk);
            /**
             * We also want to handle errors depending on
             * the receipt. We do not want to keep sending
             * notifications in case the user has turned
             * them off.
             */
            for (const receiptId in receiptsChunk) {
                if (Object.prototype.hasOwnProperty.call(receiptsChunk, receiptId)) {
                    const receipt = receiptsWithToken.find(rec => rec.id === receiptId);
                    const { status } = receiptsChunk[receiptId];
                    if (status === 'error') {
                        await this.handleNotificationErrors(
                            ctx,
                            receiptsChunk[receiptId],
                            receipt?.expoPushToken ?? '',
                        );
                    }
                }
            }
        }
    }
}
