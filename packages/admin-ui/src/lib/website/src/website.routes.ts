import { Route } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { CustomerFragment, detailBreadcrumb, PageComponent, PageService } from '@vendure/admin-ui/core';

export const createRoutes = (pageService: PageService): Route[] => [
    {
        path: 'website',
        component: PageComponent,
        data: {
            locationId: 'edit-website',
            breadcrumb: _('breadcrumb.website'),
        },
        children: pageService.getPageTabRoutes('edit-website'),
    },
];
