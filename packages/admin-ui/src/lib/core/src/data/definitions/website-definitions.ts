import { gql } from 'apollo-angular';

export const WEBSITE_FRAGMENT = gql`
    fragment Website on Website {
        content
        footerContent
        id
    }
`;

export const GET_WEBSITE_QUERY = gql`
    query GetWebsite {
        getWebsite {
            ...Website
        }
    }
    ${WEBSITE_FRAGMENT}
`;

export const UPDATE_WEBSITE_MUTATION = gql`
    mutation UpdateWebsite($input: UpdateWebsiteInput!) {
        updateWebsite(input: $input) {
            ...Website
        }
    }
    ${WEBSITE_FRAGMENT}
`;
