import { NgModule } from '@angular/core';
import { RouterModule, ROUTES } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { BulkActionRegistryService, PageService, SharedModule } from '@vendure/admin-ui/core';

import { createRoutes } from './website.routes';
import { EditWebsiteComponent } from './components/edit-website/edit-website.component';

const WEBSITE_COMPONENTS = [EditWebsiteComponent];

@NgModule({
    imports: [SharedModule, RouterModule.forChild([])],
    providers: [
        {
            provide: ROUTES,
            useFactory: (pageService: PageService) => createRoutes(pageService),
            multi: true,
            deps: [PageService],
        },
    ],
    declarations: [...WEBSITE_COMPONENTS],
    exports: [...WEBSITE_COMPONENTS],
})
export class WebsiteModule {
    private static hasRegisteredTabsAndBulkActions = false;

    constructor(bulkActionRegistryService: BulkActionRegistryService, pageService: PageService) {
        if (WebsiteModule.hasRegisteredTabsAndBulkActions) {
            return;
        }

        pageService.registerPageTab({
            priority: 0,
            location: 'edit-website',
            tab: _('website.website'),
            route: '',
            component: EditWebsiteComponent,
        });

        WebsiteModule.hasRegisteredTabsAndBulkActions = true;
    }
}
