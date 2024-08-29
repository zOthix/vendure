import { gql } from 'apollo-angular';

// const PRODUCT_LIST_QUERY_PRODUCT_FRAGMENT = gql`
//     fragment ProductListQueryProductFragment on Product {
//         id
//         createdAt
//         updatedAt
//         enabled
//         languageCode
//         name
//         slug
//         featuredAsset {
//             id
//             createdAt
//             updatedAt
//             preview
//             focalPoint {
//                 x
//                 y
//             }
//         }
//         variantList {
//             totalItems
//         }
//     }
// `;

// export const PRODUCT_LIST_QUERY = gql`
//     query PriceVariantListQuery() {
//         products(options: $options) {
//             items {
//                 ...ProductListQueryProductFragment
//             }
//             totalItems
//         }
//     }
// `;

const frag = gql`
    fragment ProductPriceVariantListQueryfrag on ProductVariantPriceVariant {
        id
        name
    }
`;

export const PRODUCT_PRICE_VARIANTS_QUERY = gql`
    query ProductPriceVariantListQuery {
        items: productPriceVariants {
            ...ProductPriceVariantListQueryfrag
        }
    }
`;

// const PRODUCT_PRICE_VARIANT_LIST_QUERY_PRODUCT_VARIANT_PRICE_VARIANT_FRAGMENT = gql`
//     fragment ProductPriceVariantListQueryFragment on ProductVariantPriceVariant {
//         id
//         name
//     }
// `;

// export const PRODUCT_PRICE_VARIANT_LIST_QUERY = gql`
//     query ProductPriceVariantListQuery() {
//         priceVariants(options: $options) {
//             items {
//               id
//               name
//             }
//             totalItems
//         }
//     }
// `;
