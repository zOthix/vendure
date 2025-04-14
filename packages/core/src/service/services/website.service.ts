import { Injectable } from '@nestjs/common';
import { UpdateWebsiteInput } from '@vendure/common/lib/generated-types';

import { RequestContext } from '../../api/common/request-context';
import { TransactionalConnection } from '../../connection/transactional-connection';
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
            .find({ order: { id: 'ASC' }, take: 1 });
        if (website.length === 0) {
            return;
        }
        return website[0];
    }

    async update(ctx: RequestContext, input: UpdateWebsiteInput): Promise<Website> {
        const websiteRepository = this.connection.getRepository(ctx, Website);
        const website = await websiteRepository.find({ order: { id: 'ASC' }, take: 1 });
        if (website.length === 0) {
            const newWebsite = new Website(input);
            return await websiteRepository.save(newWebsite);
        }
        const tempWebsite = website[0];
        if (input.content) {
            tempWebsite.content = input.content;
        }
        if (input.footerContent) {
            tempWebsite.footerContent = input.footerContent;
        }
        return websiteRepository.save(tempWebsite);
    }
}
