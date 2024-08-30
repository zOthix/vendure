import { gql } from 'apollo-angular';

const PRODUCT_PRICE_VARIANT_LIST_QUERY_PRODUCT_VARIANT_PRICE_VARIANT_FRAGMENT = gql`
    fragment ProductPriceVariantListQueryFragment on ProductVariantPriceVariant {
        id
        name
    }
`;

export const PRODUCT_PRICE_VARIANT_LIST_QUERY = gql`
    query ProductPriceVariantList {
        productPriceVariants {
            items {
                ...ProductPriceVariantListQueryFragment
            }
            totalItems
        }
    }
    ${PRODUCT_PRICE_VARIANT_LIST_QUERY_PRODUCT_VARIANT_PRICE_VARIANT_FRAGMENT}
`;
