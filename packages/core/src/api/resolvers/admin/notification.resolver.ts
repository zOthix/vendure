import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MutationSendNotificationArgs, Success } from '@vendure/common/lib/generated-types';

import { NotificationService } from '../../../service/services/notification.service';
import { RequestContext } from '../../common/request-context';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver()
export class NotificationResolver {
    constructor(private notificationService: NotificationService) {}

    @Mutation()
    async sendNotification(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationSendNotificationArgs,
    ): Promise<Success> {
        const { customerIds, notificationBody, categories, priceVariant, noOrderCustomers, days } =
            args.input;
        const success = await this.notificationService.sendNotification(
            ctx,
            notificationBody,
            customerIds,
            priceVariant,
            categories,
            noOrderCustomers,
            days,
        );
        return { success };
    }
}
