import { Injectable } from '@nestjs/common';
import {
    CreateCarousalItemInput,
    CreateWebLinkInput,
    UpdateCarousalItemInput,
    UpdateCarousalItemsInput,
    UpdateWebLinkInput,
    UpdateWebLinksInput,
    UpdateWebsiteInput,
} from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { Asset } from '../../entity';
import { CarousalItem } from '../../entity/website/carousal-item.entity';
import { WebLink } from '../../entity/website/web-link.entity';
import { Website } from '../../entity/website/website.entity';
import { EntityHydrator } from '../helpers/entity-hydrator/entity-hydrator.service';

import { AssetService } from './asset.service';

const WEBSITE_RELATIONS = [
    'weblinks',
    'weblinks.featuredAsset',
    'carousalItems',
    'carousalItems.featuredAsset',
];

/**
 * @description
 * Contains methods relating to {@link Website} entity.
 *
 * @docsCategory services
 */
@Injectable()
export class WebsiteService {
    constructor(
        private connection: TransactionalConnection,
        private assetService: AssetService,
        private entityHydrator: EntityHydrator,
    ) {}

    async getWebsite(ctx: RequestContext): Promise<Website | undefined> {
        const website = await this.connection.getRepository(ctx, Website).find({
            relations: WEBSITE_RELATIONS,
            order: { id: 'ASC' },
            take: 1,
        });
        if (website.length === 0) {
            return;
        }
        return website[0];
    }

    async updateWebsite(ctx: RequestContext, input: UpdateWebsiteInput): Promise<Website> {
        const now = new Date();
        const websiteRepository = this.connection.getRepository(ctx, Website);
        const website = await this.getWebsite(ctx);
        if (!website) {
            const newWebsite = new Website({
                ...input,
                contentUpdatedAt: now,
                weblinks: [],
                carousalItems: [],
            });
            return websiteRepository.save(newWebsite);
        }
        if (input.content) {
            website.content = input.content;
            website.contentUpdatedAt = now;
        }
        if (input.footerContent) {
            website.footerContent = input.footerContent;
        }
        if (input.announcementBarText) {
            website.announcementBarText = input.announcementBarText;
        }
        return websiteRepository.save(website);
    }

    async findWebLink(ctx: RequestContext, id: ID): Promise<WebLink | undefined> {
        const weblink = await this.connection.getRepository(ctx, WebLink).findOneBy({
            id: id as number,
        });
        if (!weblink) {
            return;
        }
        return weblink;
    }

    async findCarousalItem(ctx: RequestContext, id: ID): Promise<CarousalItem | undefined> {
        const item = await this.connection.getRepository(ctx, CarousalItem).findOneBy({
            id: id as number,
        });
        if (!item) {
            return;
        }
        return item;
    }

    async createWebLink(ctx: RequestContext, input: CreateWebLinkInput): Promise<WebLink> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        const webLinksCount = await weblinkRepository.count();
        if (webLinksCount >= 4) {
            throw new Error('Cannot make more than 4 weblinks.');
        }
        const website = await this.getWebsite(ctx);
        if (!website) {
            throw new Error('Website not generated.');
        }
        const featuredAsset = await this.getFeaturedAsset(ctx, input.featuredAsset);
        const newWebLink = new WebLink({
            ...input,
            featuredAsset,
            website,
        });
        return weblinkRepository.save(newWebLink);
    }

    async updateWebLink(ctx: RequestContext, input: UpdateWebLinkInput): Promise<WebLink> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        const weblink = await this.findWebLink(ctx, input.id);
        if (!weblink) {
            return this.createWebLink(ctx, {
                link: input.link ?? '',
                linkText: input.linkText ?? '',
                position: input.position ?? 0,
                featuredAsset: input.featuredAsset ?? undefined,
            });
        }
        const featuredAsset = await this.getFeaturedAsset(ctx, input.featuredAsset);
        if (input.link) {
            weblink.link = input.link;
        }
        if (input.linkText) {
            weblink.linkText = input.linkText;
        }
        if (input.position) {
            weblink.position = input.position;
        }
        if (featuredAsset) {
            weblink.featuredAsset = featuredAsset;
        } else {
            weblink.featuredAsset = null;
        }
        return weblinkRepository.save(weblink);
    }

    async updateWebLinks(ctx: RequestContext, input: UpdateWebLinksInput) {
        const links = input.links || [];
        const operations = links.map(i => this.updateWebLink(ctx, i));
        return Promise.all(operations);
    }

    async getWebLinks(ctx: RequestContext): Promise<WebLink[]> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        return weblinkRepository.find({ order: { id: 'ASC' }, take: 4 });
    }

    async createCarousalItem(ctx: RequestContext, input: CreateCarousalItemInput): Promise<CarousalItem> {
        const carousalItemRepository = this.connection.getRepository(ctx, CarousalItem);
        const featuredAsset = await this.getFeaturedAsset(ctx, input.featuredAsset);
        const website = await this.getWebsite(ctx);
        if (!website) {
            throw new Error('Website not generated.');
        }
        const newCarousalItem = new CarousalItem({
            featuredAsset,
            position: input.position,
            website,
        });
        return carousalItemRepository.save(newCarousalItem);
    }

    async updateCarousalItem(ctx: RequestContext, input: UpdateCarousalItemInput): Promise<CarousalItem> {
        const carousalItemRepository = this.connection.getRepository(ctx, CarousalItem);
        const shouldIsActiveUpdate = input.isActive !== undefined;
        const featuredAsset = await this.getFeaturedAsset(ctx, input.featuredAsset);
        if (!featuredAsset) {
            throw new Error('Asset is required for carousal items.');
        }
        const item = await this.findCarousalItem(ctx, input.id);
        if (!item) {
            return this.createCarousalItem(ctx, {
                featuredAsset: featuredAsset.id,
                isActive: input.isActive ?? true,
                position: input.position ?? 0,
            });
        }
        if (input.position) {
            item.position = input.position;
        }
        if (shouldIsActiveUpdate) {
            item.isActive = input.isActive as boolean;
        }
        if (input.featuredAsset) {
            item.featuredAsset = featuredAsset;
        }
        const savedItem = await carousalItemRepository.save(item);
        return this.entityHydrator.hydrate(ctx, savedItem, { relations: ['featuredAsset' as never] });
    }

    async updateCarousalItems(ctx: RequestContext, input: UpdateCarousalItemsInput) {
        const links = input.items || [];
        const operations = links.map(i => this.updateCarousalItem(ctx, i));
        return await Promise.all(operations);
    }

    private async getFeaturedAsset(ctx: RequestContext, id: ID | undefined) {
        let featuredAsset: Asset | undefined;
        if (id) {
            featuredAsset = await this.assetService.findOne(ctx, id);
        }
        return featuredAsset;
    }
}
