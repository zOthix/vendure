import { Injectable } from '@nestjs/common';
import { MutationAddPriceVariantArgs } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { Translated } from '../../common';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { ProductVariantPrice } from '../../entity';
import { ProductVariantPriceVariant } from '../../entity/product-variant/product-variant-price-variant.entity';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { TranslatableSaver } from '../helpers/translatable-saver/translatable-saver';
import { TranslatorService } from '../helpers/translator/translator.service';

/**
 * @description
 * Contains methods relating to {@link ProductOption} entities.
 *
 * @docsCategory services
 */
@Injectable()
export class ProductPriceVariantService {
    constructor(
        private connection: TransactionalConnection,
        private translatableSaver: TranslatableSaver,
        private listQueryBuilder: ListQueryBuilder,
        private translator: TranslatorService,
    ) {}

    async findOne(ctx: RequestContext, input: ID): Promise<ProductVariantPriceVariant | null> {
        return this.connection.getRepository(ctx, ProductVariantPriceVariant).findOneBy({
            id: input as number,
        });
    }

    async findAll(ctx: RequestContext): Promise<PaginatedList<ProductVariantPriceVariant>> {
        return this.listQueryBuilder
            .build(ProductVariantPriceVariant)
            .getManyAndCount()
            .then(async ([variants, totalItems]) => {
                const items = variants.map(variant => variant);
                return {
                    items,
                    totalItems,
                };
            });
    }

    async create(
        ctx: RequestContext,
        input: MutationAddPriceVariantArgs,
    ): Promise<ProductVariantPriceVariant> {
        const productVariantPriceRepository = this.connection.getRepository(ctx, ProductVariantPrice);
        const productVariantPriceList = await productVariantPriceRepository.find();
        const entity = new ProductVariantPriceVariant(input);
        for (const productVariantPrice of productVariantPriceList) {
            if (productVariantPrice.priceVariant) {
                productVariantPrice.priceVariant.push(entity);
            } else {
                productVariantPrice.priceVariant = [entity];
            }
        }
        await productVariantPriceRepository.save(productVariantPriceList);
        return await this.connection.getRepository(ctx, ProductVariantPriceVariant).save(entity as any);
    }
}
