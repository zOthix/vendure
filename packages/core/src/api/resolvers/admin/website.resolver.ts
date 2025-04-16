import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import {
    MutationUpdateWebsiteArgs,
    Permission,
    MutationCreateWebLinkArgs,
    MutationUpdateWebLinksArgs,
} from '@vendure/common/lib/generated-types';

import { WebLink } from '../../../entity/website/web-link.entity';
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

    @Mutation()
    @Allow(Permission.Authenticated)
    createWebLink(@Ctx() ctx: RequestContext, @Args() args: MutationCreateWebLinkArgs): Promise<WebLink> {
        const { input } = args;
        return this.websiteService.createWeblink(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    updateWebLinks(@Ctx() ctx: RequestContext, @Args() args: MutationUpdateWebLinksArgs): Promise<WebLink[]> {
        const { input } = args;
        return this.websiteService.updateWebLinks(ctx, input);
    }
}
