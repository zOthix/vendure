// tab.component.ts
import { Component, Input } from '@angular/core';

@Component({
    selector: 'vdr-tab',
    templateUrl: './tab.component.html',
    styleUrls: ['./tab.component.scss'],
})
export class TabComponent {
    @Input() title = '';
    @Input() active = false;
}
