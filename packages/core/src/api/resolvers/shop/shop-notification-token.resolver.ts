import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { MutationSetNotificationTokenArgs } from '@vendure/common/lib/generated-shop-types';
import { Permission, Success } from '@vendure/common/lib/generated-types';

import { NotificationTokenService } from '../../../service/services/notification-token.service';
import { RequestContext } from '../../common/request-context';
import { Allow } from '../../decorators/allow.decorator';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver()
export class ShopNotificationTokenResolver {
    constructor(private notificationTokenService: NotificationTokenService) {}

    @Mutation()
    async setNotificationToken(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationSetNotificationTokenArgs,
    ): Promise<Success> {
        const success = await this.notificationTokenService.setNotificationToken(ctx, args.token);
        return { success };
    }
}
