import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    MutationAddPriceVariantArgs,
    ProductVariantPriceVariant,
    QueryProductPriceVariantArgs,
} from '@vendure/common/lib/generated-types';
import { PaginatedList } from '@vendure/common/lib/shared-types';

import { ProductPriceVariantService } from '../../../service/services/product-price-variant.service';
import { RequestContext } from '../../common/request-context';
import { Ctx } from '../../decorators/request-context.decorator';

@Resolver()
export class ProductPriceVariantResolver {
    constructor(private productPriceVariantService: ProductPriceVariantService) {}

    @Query('productPriceVariants')
    async getAllPriceVariants(
        @Ctx() ctx: RequestContext,
    ): Promise<PaginatedList<ProductVariantPriceVariant>> {
        return this.productPriceVariantService.findAll(ctx);
    }

    @Query('productPriceVariant')
    async getPriceVariantById(
        @Ctx() ctx: RequestContext,
        @Args() args: QueryProductPriceVariantArgs,
    ): Promise<ProductVariantPriceVariant | null> {
        return this.productPriceVariantService.findOne(ctx, args.id);
    }

    @Mutation()
    async addPriceVariant(@Ctx() ctx: RequestContext, @Args() arg: MutationAddPriceVariantArgs) {
        return this.productPriceVariantService.create(ctx, arg);
    }
}
