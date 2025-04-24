import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    BrandListQueryDocument,
    DataService,
    JobQueueService,
    ModalService,
    NotificationService,
    ProductListQueryDocument,
    TypedBaseListComponent,
} from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { EMPTY, firstValueFrom, lastValueFrom } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

@Component({
    selector: 'vdr-brand-list',
    templateUrl: './brand-list.component.html',
    styleUrls: ['./brand-list.component.scss'],
})
export class BrandListComponent
    extends TypedBaseListComponent<typeof BrandListQueryDocument, 'brands'>
    implements OnInit
{
    constructor(
        protected dataService: DataService,
        private modalService: ModalService,
        private notificationService: NotificationService,
        private jobQueueService: JobQueueService,
    ) {
        super();
        this.configure({
            document: BrandListQueryDocument,
            getItems: data => data.brands,
        });
    }
}
