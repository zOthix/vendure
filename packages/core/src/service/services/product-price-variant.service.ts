import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    DeletionResponse,
    DeletionResult,
    PriceVariantInput,
    UpdatePriceVariantInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { assertFound, ListQueryOptions } from '../../common';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { ProductVariant } from '../../entity';
import { ProductVariantPriceToPriceVariant } from '../../entity/product-variant/product-variant-price-price-variant.entity';
import { ProductVariantPriceVariant } from '../../entity/product-variant/product-variant-price-variant.entity';
import { EventBus } from '../../event-bus';
import { PriceVariantEvent } from '../../event-bus/events/price-variant-events';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';
import { ProductPriceApplicator } from '../helpers/product-price-applicator/product-price-applicator';

import { ProductVariantService } from './product-variant.service';

/**
 * @description
 * Contains methods relating to {@link ProductOption} entities.
 *
 * @docsCategory services
 */
@Injectable()
export class ProductPriceVariantService implements OnModuleInit {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private productPriceApplicator: ProductPriceApplicator,
        private productVariantService: ProductVariantService,
        private eventBus: EventBus,
    ) {}

    onModuleInit() {
        this.eventBus.ofType(PriceVariantEvent).subscribe(event => {
            if (event.type === 'created') {
                return this.attachPriceVariantToAllProductVariants(event.ctx, event.entity);
            }
        });
    }

    async findOne(ctx: RequestContext, id: ID): Promise<ProductVariantPriceVariant | undefined> {
        return this.connection
            .getRepository(ctx, ProductVariantPriceVariant)
            .findOneBy({
                id,
            })
            .then(variant => variant ?? undefined);
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
            .then(([items, totalItems]) => ({ items, totalItems }));
    }

    async updatePriceVariantsForProductVariant(
        ctx: RequestContext,
        productVariantId: ID,
        priceVariants: PriceVariantInput[],
    ) {
        const productVariant = await this.productVariantService.findOne(ctx, productVariantId);
        if (!productVariant) {
            return;
        }
        const productVariantPrice = productVariant.productVariantPrices.find(
            i => i.channelId === ctx.channelId,
        );
        if (!productVariantPrice) {
            return;
        }
        const attached: ID[] = [];
        const variants: ProductVariantPriceToPriceVariant[] = [];
        const allPriceVariants = await this.connection.getRepository(ctx, ProductVariantPriceVariant).find();
        priceVariants.forEach(item => {
            const productVariantPriceVariant = allPriceVariants.find(i => i.id === item.id);
            if (productVariantPriceVariant && !attached.includes(productVariantPriceVariant.id)) {
                attached.push(productVariantPriceVariant.id);
                const variant = new ProductVariantPriceToPriceVariant({
                    price: item.price,
                    productVariantPrice,
                    productVariantPriceVariant,
                });
                variants.push(variant);
            }
        });
        await this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant).save(variants);
    }

    async create(ctx: RequestContext, name: string): Promise<ProductVariantPriceVariant> {
        const priceVariant = await this.connection.getRepository(ctx, ProductVariantPriceVariant).save({
            name,
        });
        await this.eventBus.publish(new PriceVariantEvent(ctx, priceVariant, 'created'));
        return priceVariant;
    }

    async update(
        ctx: RequestContext,
        input: UpdatePriceVariantInput,
    ): Promise<ProductVariantPriceVariant | undefined> {
        const repository = this.connection.getRepository(ctx, ProductVariantPriceVariant);
        const priceVariant = await repository.findOneBy({
            id: input.id,
        });
        if (!priceVariant) {
            return;
        }
        priceVariant.name = input.name ?? priceVariant.name;
        await repository.save(priceVariant);
        await this.eventBus.publish(new PriceVariantEvent(ctx, priceVariant, 'updated'));
        return assertFound(this.findOne(ctx, priceVariant.id));
    }

    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const priceVariant = await this.findOne(ctx, id);
        if (priceVariant) {
            await this.detachPriceVariantfromAllProductVariants(ctx, priceVariant);
            await this.connection.getRepository(ctx, ProductVariantPriceVariant).remove(priceVariant);
            await this.eventBus.publish(new PriceVariantEvent(ctx, priceVariant, 'deleted'));
        }
        const message = '';
        const result = DeletionResult.DELETED;
        return {
            result,
            message,
        };
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
        await this.productPriceApplicator.applyChannelPriceAndTax(variant, ctx, undefined);
        return variant.priceVariantPrice(ctx.channelId, priceVariantId);
    }

    private async attachPriceVariantToAllProductVariants(
        ctx: RequestContext,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const productVariants = await this.productVariantService.findAll(ctx, {});
        const priceVariants: ProductVariantPriceToPriceVariant[] = [];
        productVariants.items.forEach(variant => {
            const price = variant.productVariantPrices.find(p => p.channelId === ctx.channelId);
            priceVariants.push(
                new ProductVariantPriceToPriceVariant({
                    productVariantPrice: price,
                    productVariantPriceVariant: priceVariant,
                    price: price?.price ?? 0,
                }),
            );
        });
        return await this.connection
            .getRepository(ctx, ProductVariantPriceToPriceVariant)
            .save(priceVariants);
    }

    private async detachPriceVariantfromAllProductVariants(
        ctx: RequestContext,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const repository = this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant);
        const priceVariants = await repository.findBy({
            productVariantPriceVariantId: priceVariant.id,
        });
        return await this.connection
            .getRepository(ctx, ProductVariantPriceToPriceVariant)
            .remove(priceVariants);
    }
}
