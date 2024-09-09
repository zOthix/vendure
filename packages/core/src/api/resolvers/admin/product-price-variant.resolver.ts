import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    MutationCreatePriceVariantArgs,
    QueryProductPriceVariantArgs,
    MutationUpdatePriceVariantArgs,
    ProductVariantPriceVariantListOptions,
} from '@vendure/common/lib/generated-types';
import { PaginatedList } from '@vendure/common/lib/shared-types';

import { ProductVariantPriceVariant } from '../../../entity';
import { ProductPriceVariantService } from '../../../service/services/product-price-variant.service';
import { RequestContext } from '../../common/request-context';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver()
export class ProductPriceVariantResolver {
    constructor(private productPriceVariantService: ProductPriceVariantService) {}

    @Query()
    async productPriceVariants(
        @Ctx() ctx: RequestContext,
        @Args() args: { options: ProductVariantPriceVariantListOptions },
    ): Promise<PaginatedList<ProductVariantPriceVariant>> {
        return this.productPriceVariantService.findAll(ctx, args.options);
    }

    @Query()
    async productPriceVariant(
        @Ctx() ctx: RequestContext,
        @Args() args: QueryProductPriceVariantArgs,
    ): Promise<ProductVariantPriceVariant | null> {
        return this.productPriceVariantService.findOne(ctx, args.id);
    }

    @Mutation()
    async createPriceVariant(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationCreatePriceVariantArgs,
    ): Promise<ProductVariantPriceVariant> {
        return this.productPriceVariantService.create(ctx, args);
    }

    @Mutation()
    async updatePriceVariant(
        @Ctx() ctx: RequestContext,
        @Args() args: MutationUpdatePriceVariantArgs,
    ): Promise<ProductVariantPriceVariant | undefined> {
        const { input } = args;
        return this.productPriceVariantService.update(ctx, input);
    }
}
