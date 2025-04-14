import * as Codegen from '../../common/generated-types';
import { GET_WEBSITE_QUERY } from '../definitions/website-definitions';

import { BaseDataService } from './base-data.service';

export class WebsiteDataService {
    constructor(private baseDataService: BaseDataService) {}

    getWebsite() {
        return this.baseDataService.query<Codegen.GetWebsiteQueryVariables>(GET_WEBSITE_QUERY);
    }
}
