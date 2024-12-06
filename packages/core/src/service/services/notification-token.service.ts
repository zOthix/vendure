import { Injectable } from '@nestjs/common';

import { RequestContext } from '../../api';
import { TransactionalConnection } from '../../connection';
import { NotificationToken } from '../../entity/notification-token/notification-token.entity';

/**
 * @description
 * Contains methods relating to {@link NotificationToken} entities.
 *
 * @docsCategory services
 */
@Injectable()
export class NotificationTokenService {
    constructor(private connection: TransactionalConnection) {}

    async setNotificationToken(ctx: RequestContext, token: string): Promise<boolean> {
        try {
            await this.connection
                .getRepository(ctx, NotificationToken)
                .save(new NotificationToken({ token }));
            return true;
        } catch (e: any) {
            return false;
        }
    }
}
