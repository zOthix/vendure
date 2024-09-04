import { Injectable } from '@nestjs/common';
import { MutationCreatePriceVariantArgs, UpdatePriceVariantInput } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { assertFound } from '../../common';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { ProductVariantPrice } from '../../entity';
import { ProductVariantPriceToPriceVariant } from '../../entity/product-variant/product-variant-price-price-variant.entity';
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
        input: MutationCreatePriceVariantArgs,
    ): Promise<ProductVariantPriceVariant> {
        const newProductVariantPriceVariant = new ProductVariantPriceVariant(input);
        const savedEntity = await this.connection
            .getRepository(ctx, ProductVariantPriceVariant)
            .save(newProductVariantPriceVariant as any);
        const productVariantPriceList = await this.connection.getRepository(ctx, ProductVariantPrice).find({
            relations: ['productVariantPriceVariant'],
        });
        const productVariantPriceToPriceVariantRepository = this.connection.getRepository(
            ctx,
            ProductVariantPriceToPriceVariant,
        );
        const x = await productVariantPriceToPriceVariantRepository.find({
            relations: ['productVariantPriceVariant', 'productVariantPrice'],
        });
        const conjunctionObjectList = [];
        for (const productVariantPrice of productVariantPriceList) {
            const conjunction = new ProductVariantPriceToPriceVariant({
                productVariantPrice,
                productVariantPriceVariant: savedEntity,
                price: productVariantPrice.price,
            });
            conjunctionObjectList.push(conjunction);
        }
        await productVariantPriceToPriceVariantRepository.save(conjunctionObjectList as any);
        return savedEntity;
    }

    async update(
        ctx: RequestContext,
        input: UpdatePriceVariantInput,
    ): Promise<ProductVariantPriceVariant | undefined> {
        const productPriceVariantRepository = this.connection.getRepository(ctx, ProductVariantPriceVariant);
        const entity = await productPriceVariantRepository.findOneBy({
            id: input.id as number,
        });
        if (!entity) {
            return;
        }
        entity.name = input.name ? input.name : entity.name;
        await productPriceVariantRepository.save(entity as any);
        return assertFound(this.findOne(ctx, entity.id));
    }
}
