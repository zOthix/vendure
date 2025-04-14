import { gql } from 'apollo-angular';

export const GET_WEBSITE_QUERY = gql`
    query GetWebsite {
        getWebsite {
            content
            footerContent
            id
        }
    }
`;
