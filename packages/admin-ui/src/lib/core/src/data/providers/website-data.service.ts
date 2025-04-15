import * as Codegen from '../../common/generated-types';
import { GET_WEBSITE_QUERY, UPDATE_WEBSITE_MUTATION } from '../definitions/website-definitions';

import { BaseDataService } from './base-data.service';

export class WebsiteDataService {
    constructor(private baseDataService: BaseDataService) {}

    getWebsite() {
        return this.baseDataService.query<Codegen.GetWebsiteQueryVariables>(GET_WEBSITE_QUERY);
    }

    updateWebsite(input: Codegen.UpdateWebsiteInput) {
        return this.baseDataService.mutate<
            Codegen.UpdateWebsiteMutation,
            Codegen.UpdateWebsiteMutationVariables
        >(UPDATE_WEBSITE_MUTATION, {
            input,
        });
    }
}
