import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { MutationCreateWebLinkArgs, Permission, WebLink } from '@vendure/common/lib/generated-types';

import { WebsiteService } from '../../../service/services/website.service';
import { RequestContext } from '../../common/request-context';
import { Allow } from '../../decorators/allow.decorator';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver('Website')
export class WebsiteResolver {
    constructor(private websiteService: WebsiteService) {}

    @Mutation()
    @Allow(Permission.Authenticated)
    createWebLink(@Ctx() ctx: RequestContext, @Args() args: MutationCreateWebLinkArgs): Promise<WebLink> {
        const { input } = args;
        return this.websiteService.createWeblink(ctx, input);
    }
}
