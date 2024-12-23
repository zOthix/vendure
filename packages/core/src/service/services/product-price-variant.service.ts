import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    DeletionResponse,
    DeletionResult,
    PriceVariantInput,
    UpdatePriceVariantInput,
} from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';

import { RequestContext } from '../../api/common/request-context';
import { assertFound, ListQueryOptions, roundMoney } from '../../common';
import { TransactionalConnection } from '../../connection/transactional-connection';
import { ProductVariant, ProductVariantPrice } from '../../entity';
import { ProductVariantPriceToPriceVariant } from '../../entity/product-variant/product-variant-price-price-variant.entity';
import { ProductVariantPriceVariant } from '../../entity/product-variant/product-variant-price-variant.entity';
import { EventBus } from '../../event-bus';
import { PriceVariantEvent } from '../../event-bus/events/price-variant-events';
import { ListQueryBuilder } from '../helpers/list-query-builder/list-query-builder';

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
        let message: string;
        let result: DeletionResult;
        const priceVariant = await this.findOne(ctx, id);
        if (priceVariant) {
            // Remove price variant references from the conjunction table so it can be deleted
            await this.detachPriceVariantfromAllProductVariants(ctx, priceVariant);
            await this.connection.getRepository(ctx, ProductVariantPriceVariant).remove(priceVariant);
            await this.eventBus.publish(new PriceVariantEvent(ctx, priceVariant, 'deleted'));
            message = '';
            result = DeletionResult.DELETED;
        } else {
            message = 'Price variant does not exist.';
            result = DeletionResult.NOT_DELETED;
        }
        return {
            result,
            message,
        };
    }

    /**
     * This updates the prices of the price variants
     * for an already added product. Mainly used for
     * csv creation/updation.
     */
    async updatePriceVariantsForProductVariant(
        ctx: RequestContext,
        productVariant: ProductVariant,
        priceVariantInput: PriceVariantInput[],
    ) {
        const price = this.getChannelPrice(ctx, productVariant);
        if (!price) {
            return;
        }
        const attached = new Set<ID>();
        const priceVariants = await this.findAll(ctx, {});
        const variants: ProductVariantPriceToPriceVariant[] = [];
        priceVariantInput.forEach(variant => {
            const priceVariant = priceVariants.items.find(i => i.id === variant.id);
            if (priceVariant && !attached.has(priceVariant.id)) {
                attached.add(priceVariant.id);
                variants.push(
                    new ProductVariantPriceToPriceVariant({
                        price: variant.price,
                        productVariantPrice: price,
                        productVariantPriceVariant: variant,
                    }),
                );
            }
        });
        return this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant).save(variants);
    }

    /**
     * Attach all missing price variants to
     * the product variant. This is used when
     * reindexing the search index table.
     */
    async attachAllPriceVariantsToProductVariant(
        ctx: RequestContext,
        productVariant: ProductVariant,
    ): Promise<ProductVariantPriceToPriceVariant[] | undefined> {
        const price = this.getChannelPrice(ctx, productVariant);
        if (!price) {
            return;
        }
        const missingVariants = await this.missingPriceVariants(ctx, productVariant);
        const entities = missingVariants.map(
            variant =>
                new ProductVariantPriceToPriceVariant({
                    price: price.price || 0,
                    productVariantPriceVariant: variant,
                    productVariantPrice: price,
                }),
        );
        return this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant).save(entities);
    }

    getPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        priceVariant: ProductVariantPriceVariant,
    ): number {
        const price = this.getChannelPrice(ctx, productVariant);
        if (!price) {
            return 0;
        }
        const exists = this.getPriceVariant(ctx, price, priceVariant);
        if (!exists) {
            return 0;
        }
        if (!productVariant.taxRateApplied) {
            return 0;
        }
        return roundMoney(
            productVariant.listPriceIncludesTax
                ? productVariant.taxRateApplied.netPriceOf(exists.price)
                : exists.price,
        );
    }

    /**
     * Get the price variant price with the
     * tax applied.
     */
    getPriceWithTax(
        ctx: RequestContext,
        productVariant: ProductVariant,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const price = this.getChannelPrice(ctx, productVariant);
        if (!price) {
            return 0;
        }
        const exists = this.getPriceVariant(ctx, price, priceVariant);
        if (!exists) {
            return 0;
        }
        if (!productVariant.taxRateApplied) {
            return 0;
        }
        return roundMoney(
            productVariant.listPriceIncludesTax
                ? exists.price
                : productVariant.taxRateApplied.grossPriceOf(exists.price),
        );
    }

    /**
     * Apply the price variant price instead of the
     * default price.
     */
    applyPriceVariantPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const price = this.getPrice(ctx, productVariant, priceVariant);
        productVariant.listPrice = price;
        return productVariant;
    }

    /**
     * Get all the price variants from current
     * channel price of the product variant. Prices
     * should be joined with product variant.
     */
    async getAllPriceVariantPricesForProductVariant(ctx: RequestContext, productVariant: ProductVariant) {
        const price = this.getChannelPrice(ctx, productVariant);
        if (!price) {
            return;
        }
        return price.productVariantPriceVariant;
    }

    /**
     * Attaches the new price variant to each product
     * variant that already exists. This is in case
     * a new price variant has been created.
     */
    private async attachPriceVariantToAllProductVariants(
        ctx: RequestContext,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const productVariants = await this.connection
            .getRepository(ctx, ProductVariant)
            .find({ relations: ['productVariantPrices'] });
        const priceVariants = productVariants.map(variant => {
            const price = this.getChannelPrice(ctx, variant);
            return new ProductVariantPriceToPriceVariant({
                productVariantPrice: price,
                productVariantPriceVariant: priceVariant,
                price: price?.price ?? 0,
            });
        });
        return this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant).save(priceVariants);
    }

    /**
     * Removes all conjunction rows for the
     * price variant so that the price variant
     * itself can be delted.
     */
    private async detachPriceVariantfromAllProductVariants(
        ctx: RequestContext,
        priceVariant: ProductVariantPriceVariant,
    ) {
        const repository = this.connection.getRepository(ctx, ProductVariantPriceToPriceVariant);
        const priceVariants = await repository.findBy({
            productVariantPriceVariantId: priceVariant.id,
        });
        return repository.remove(priceVariants);
    }

    /**
     * Returns the missing price variants for
     * a product variant
     */
    private async missingPriceVariants(ctx: RequestContext, productVariant: ProductVariant) {
        const priceVariants = await this.findAll(ctx, {});
        const price = this.getChannelPrice(ctx, productVariant);
        const missingVariants: ProductVariantPriceVariant[] = [];
        priceVariants.items.forEach(variant => {
            const exists = price?.productVariantPriceVariant.find(
                i => i.productVariantPriceVariantId === variant.id,
            );
            if (!exists) {
                missingVariants.push(variant);
            }
        });
        return missingVariants;
    }

    private async missingPriceVariantIds(ctx: RequestContext, productVariant: ProductVariant) {
        const missingVariants = (await this.missingPriceVariants(ctx, productVariant)).map(i => i.id);
        return missingVariants;
    }

    private getChannelPrice(ctx: RequestContext, productVariant: ProductVariant) {
        const price = productVariant.productVariantPrices.find(i => i.channelId === ctx.channelId);
        if (!price) {
            return;
        }
        return price;
    }

    private getPriceVariant(
        ctx: RequestContext,
        price: ProductVariantPrice,
        priceVariant: ProductVariantPriceVariant,
    ) {
        return price.productVariantPriceVariant.find(i => i.productVariantPriceVariantId === priceVariant.id);
    }
}
