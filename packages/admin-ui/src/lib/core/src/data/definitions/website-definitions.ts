import { gql } from 'apollo-angular';

export const WEBLINK_FRAGMENT = gql`
    fragment WebLink on WebLink {
        id
        link
        linkText
        position
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

export const WEBSITE_FRAGMENT = gql`
    fragment Website on Website {
        content
        footerContent
        announcementBarText
        id
        weblinks {
            ...WebLink
        }
    }
    ${WEBLINK_FRAGMENT}
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

export const UPDATE_WEBLINK_MUTATION = gql`
    mutation UpdateWebLinks($input: UpdateWebLinksInput!) {
        updateWebLinks(input: $input) {
            ...WebLink
        }
    }
    ${WEBLINK_FRAGMENT}
`;
