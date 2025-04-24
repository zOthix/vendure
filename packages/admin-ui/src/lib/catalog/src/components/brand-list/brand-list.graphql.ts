import { gql } from 'apollo-angular';

const BRAND_LIST_QUERY_BRAND_FRAGMENT = gql`
    fragment BrandListQueryBrandFragment on Brand {
        id
        name
        slug
        isActive
        description
        featuredAsset {
            id
            createdAt
            updatedAt
            preview
            focalPoint {
                x
                y
            }
        }
    }
`;

export const BRAND_LIST_QUERY = gql`
    query BrandListQuery {
        brands {
            items {
                ...BrandListQueryBrandFragment
            }
            totalItems
        }
    }
    ${BRAND_LIST_QUERY_BRAND_FRAGMENT}
`;
