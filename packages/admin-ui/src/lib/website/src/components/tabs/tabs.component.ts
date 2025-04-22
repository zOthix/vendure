// tabs.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TabComponent } from '../tab/tab.component';

interface Tab {
    title: string;
    active: boolean;
}

@Component({
    selector: 'vdr-tabs',
    templateUrl: './tabs.component.html',
    styleUrls: ['./tabs.component.scss'],
})
export class TabsComponent {
    @Input() tabs: Tab[] = [];
    @Input() addNewTab = false;
    @Output() newTabClicked = new EventEmitter<void>();

    selectTab(tab: TabComponent): void {
        this.tabs.forEach(t => (t.active = false));
        tab.active = true;
    }
}
