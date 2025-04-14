import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { MutationUpdateWebsiteArgs, Permission } from '@vendure/common/lib/generated-types';

import { Website } from '../../../entity/website/website.entity';
import { WebsiteService } from '../../../service/services/website.service';
import { RequestContext } from '../../common/request-context';
import { Allow } from '../../decorators/allow.decorator';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver('Website')
export class WebsiteResolver {
    constructor(private websiteService: WebsiteService) {}

    @Query()
    @Allow(Permission.Authenticated)
    getWebsite(@Ctx() ctx: RequestContext): Promise<Website | undefined> {
        return this.websiteService.getOne(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    updateWebsite(@Ctx() ctx: RequestContext, @Args() args: MutationUpdateWebsiteArgs): Promise<Website> {
        const { input } = args;
        return this.websiteService.update(ctx, input);
    }
}
