import { Injectable } from '@nestjs/common';
import { MutationCreatePriceVariantArgs, UpdatePriceVariantInput } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { assertFound, ListQueryOptions } from '../../common';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { ProductVariant, ProductVariantPrice } from '../../entity';
import { ProductVariantPriceToPriceVariant } from '../../entity/product-variant/product-variant-price-price-variant.entity';
import { ProductVariantPriceVariant } from '../../entity/product-variant/product-variant-price-variant.entity';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { ProductPriceApplicator } from '../helpers/product-price-applicator/product-price-applicator';

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
        private listQueryBuilder: ListQueryBuilder,
        private productPriceApplicator: ProductPriceApplicator,
    ) {}

    async findOne(ctx: RequestContext, input: ID): Promise<ProductVariantPriceVariant | null> {
        return this.connection.getRepository(ctx, ProductVariantPriceVariant).findOneBy({
            id: input as number,
        });
    }

    async findAll(
        ctx: RequestContext,
        options: ListQueryOptions<ProductVariantPriceVariant> | undefined,
    ): Promise<PaginatedList<ProductVariantPriceVariant>> {
        return this.listQueryBuilder
            .build(ProductVariantPriceVariant, options, {
                ctx,
            })
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
        await productVariantPriceToPriceVariantRepository.find({
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

    async attachPriceVariantsToProductVariant(
        ctx: RequestContext,
        productVariant: ProductVariant,
    ): Promise<ProductVariantPriceToPriceVariant[] | null> {
        const productVariantPrice = productVariant.productVariantPrices.find(
            i => i.channelId === ctx.channelId,
        );
        if (!productVariantPrice) {
            return null;
        }
        const productPriceVariantList = await this.connection
            .getRepository(ctx, ProductVariantPriceVariant)
            .find();
        const productVariantPriceToPriceVariantRepository = this.connection.getRepository(
            ctx,
            ProductVariantPriceToPriceVariant,
        );
        const attachedVariantIds = productVariantPrice.productVariantPriceVariant.map(
            i => i.productVariantPriceVariant.id,
        );
        const entitiesToSave = productPriceVariantList
            .filter(variant => !attachedVariantIds.includes(variant.id))
            .map(
                variant =>
                    new ProductVariantPriceToPriceVariant({
                        price: productVariantPrice.price || 0,
                        productVariantPriceVariant: variant,
                        productVariantPrice,
                    }),
            );
        if (entitiesToSave.length > 0) {
            await productVariantPriceToPriceVariantRepository.save(entitiesToSave);
        }
        return productVariantPrice.productVariantPriceVariant.map(
            variant =>
                new ProductVariantPriceToPriceVariant({
                    price: variant.price || 0,
                    productVariantPriceVariant: variant.productVariantPriceVariant,
                    productVariantPrice,
                }),
        );
    }

    async getPrice(ctx: RequestContext, productVariant: ProductVariant, priceVariantId: ID): Promise<number> {
        const variant = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: {
                id: productVariant.id,
            },
        });
        if (!variant) {
            return 0;
        }
        return variant.priceVariantPrice(ctx.channelId, priceVariantId);
    }

    async getPriceWithTax(
        ctx: RequestContext,
        productVariant: ProductVariant,
        priceVariantId: ID,
    ): Promise<number> {
        const variant = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: {
                id: productVariant.id,
            },
        });
        if (!variant) {
            return 0;
        }
        await this.productPriceApplicator.applyChannelPriceAndTax(variant, ctx, undefined, false, true);
        return variant.priceVariantPrice(ctx.channelId, priceVariantId);
    }
}
