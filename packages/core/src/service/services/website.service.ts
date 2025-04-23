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

/**
 * @description
 * Contains methods relating to {@link Website} entities.
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

    async getOne(ctx: RequestContext): Promise<Website | undefined> {
        const website = await this.connection.getRepository(ctx, Website).find({
            relations: ['weblinks', 'weblinks.featuredAsset', 'carousalItems', 'carousalItems.featuredAsset'],
            order: { id: 'ASC' },
            take: 1,
        });
        if (website.length === 0) {
            return;
        }
        return website[0];
    }

    async update(ctx: RequestContext, input: UpdateWebsiteInput): Promise<Website> {
        const websiteRepository = this.connection.getRepository(ctx, Website);
        const website = await websiteRepository.find({
            relations: ['weblinks', 'weblinks.featuredAsset', 'carousalItems', 'carousalItems.featuredAsset'],
            order: { id: 'ASC' },
            take: 1,
        });
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

    async createWeblink(ctx: RequestContext, input: CreateWebLinkInput): Promise<WebLink> {
        const weblinkRepository = this.connection.getRepository(ctx, WebLink);
        const weblinkList = await weblinkRepository.count();
        if (weblinkList >= 4) {
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

    async updateWebLink(ctx: RequestContext, input: UpdateWebLinkInput): Promise<WebLink> {
        const weblinkRepo = this.connection.getRepository(ctx, WebLink);
        let featuredAsset: Asset | undefined;
        if (input.featuredAsset) {
            featuredAsset = await this.assetService.findOne(ctx, input.featuredAsset);
        }
        const weblink = await this.findWebLink(ctx, input.id);
        if (!weblink) {
            return this.createWeblink(ctx, {
                link: input.link || '',
                linkText: input.linkText || '',
                position: input.position,
                featuredAsset: featuredAsset ? featuredAsset.id : undefined,
            });
        }
        if (input.link) {
            weblink.link = input.link;
        }
        if (input.linkText) {
            weblink.linkText = input.linkText;
        }
        if (input.position) {
            weblink.position = input.position;
        }
        if (input.featuredAsset || input.featuredAsset === null) {
            weblink.featuredAsset = featuredAsset;
        }
        return weblinkRepo.save(weblink);
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
        const featuredAsset = await this.assetService.findOne(ctx, input.featuredAsset);
        const website = await this.getOne(ctx);
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
        let featuredAsset: Asset | undefined;
        if (input.featuredAsset) {
            featuredAsset = await this.assetService.findOne(ctx, input.featuredAsset);
        }
        const item = await this.findCarousalItem(ctx, input.id);
        if (!item) {
            if (!featuredAsset) {
                throw new Error('Asset is required for carousal items.');
            }
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
        if (input.featuredAsset && featuredAsset) {
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
}
