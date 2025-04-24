import { Component, OnInit } from '@angular/core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { ProductListQueryDocument, TypedBaseListComponent } from '@vendure/admin-ui/core';
import { ID } from '@vendure/common/lib/shared-types';
import { EMPTY, firstValueFrom, lastValueFrom } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';

@Component({
    selector: 'vdr-brand-list',
    templateUrl: './brand-list.component.html',
    styleUrls: ['./brand-list.component.scss'],
})
export class BrandListComponent
    extends TypedBaseListComponent<typeof ProductListQueryDocument, 'products'>
    implements OnInit {}
