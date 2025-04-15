import { Injectable } from '@nestjs/common';
import { CreateWebLinkInput, UpdateWebsiteInput } from '@vendure/common/lib/generated-types';

import { RequestContext } from '../../api/common/request-context';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Asset } from '../../entity';
import { WebLink } from '../../entity/website/web-link.entity';
import { Website } from '../../entity/website/website.entity';

/**
 * @description
 * Contains methods relating to {@link Website} entities.
 *
 * @docsCategory services
 */
@Injectable()
export class WebsiteService {
    constructor(private connection: TransactionalConnection) {}

    async getOne(ctx: RequestContext): Promise<Website | undefined> {
        const website = await this.connection
            .getRepository(ctx, Website)
            .find({ relations: ['weblinks', 'weblinks.featuredAsset'], order: { id: 'ASC' }, take: 1 });
        if (website.length === 0) {
            return;
        }
        return website[0];
    }

    async update(ctx: RequestContext, input: UpdateWebsiteInput): Promise<Website> {
        const websiteRepository = this.connection.getRepository(ctx, Website);
        const website = await websiteRepository.find({ order: { id: 'ASC' }, take: 1 });
        if (website.length === 0) {
            const newWebsite = new Website({
                ...input,
                weblinks: [],
            });
            return await websiteRepository.save(newWebsite);
        }
        const tempWebsite = website[0];
        if (input.content) {
            tempWebsite.content = input.content;
        }
        if (input.footerContent) {
            tempWebsite.footerContent = input.footerContent;
        }
        if (input.announcementBarText) {
            tempWebsite.announcementBarText = input.announcementBarText;
        }
        return websiteRepository.save(tempWebsite);
    }

    async createWeblink(ctx: RequestContext, input: CreateWebLinkInput): Promise<WebLink> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        const weblinkList = await weblinkRepository.count();
        if (weblinkList > 4) {
            throw new Error('Cannot make more than 4 weblinks.');
        }
        const assetRepository = this.connection.getRepository(ctx, Asset);
        const asset = await assetRepository.findOneBy({ id: input.featuredAsset });
        const website = await this.getOne(ctx);
        if (!website) {
            throw new Error('Website not generated.');
        }
        const tempWebLink = new WebLink({
            link: input.link,
            linkText: input.linkText,
            position: input.position,
            featuredAsset: asset,
            website,
        });
        return weblinkRepository.save(tempWebLink);
    }

    async getWebLinks(ctx: RequestContext): Promise<WebLink[]> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        return weblinkRepository.find({ order: { id: 'ASC' }, take: 4 });
    }
}
