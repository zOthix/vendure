import * as Codegen from '../../common/generated-types';
import {
    GET_WEBSITE_QUERY,
    UPDATE_WEBLINK_MUTATION,
    UPDATE_WEBSITE_MUTATION,
} from '../definitions/website-definitions';

import { BaseDataService } from './base-data.service';

export class WebsiteDataService {
    constructor(private baseDataService: BaseDataService) {}

    getWebsite() {
        return this.baseDataService.query<Codegen.GetWebsiteQuery, Codegen.GetWebsiteQueryVariables>(
            GET_WEBSITE_QUERY,
        );
    }

    updateWebsite(input: Codegen.UpdateWebsiteInput) {
        return this.baseDataService.mutate<
            Codegen.UpdateWebsiteMutation,
            Codegen.UpdateWebsiteMutationVariables
        >(UPDATE_WEBSITE_MUTATION, {
            input,
        });
    }

    updateWebLinks(input: Codegen.UpdateWebLinksInput) {
        return this.baseDataService.mutate<
            Codegen.UpdateWebLinksMutation,
            Codegen.UpdateWebLinksMutationVariables
        >(UPDATE_WEBLINK_MUTATION, {
            input,
        });
    }
}
