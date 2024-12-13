import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
    selector: 'vdr-multiselect',
    templateUrl: './multiselect.component.html',
    styleUrls: ['./multiselect.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MultiSelectComponent {
    @Input() options: Array<{ id: string; name: string }> | null = [];
    @Input() label = '';
    @Input() for: string;
    @Input() control: FormControl;
    @Input() selectedOptions: string[] = [];
    @Input() readonly = true;
    @Output() selectedOptionsChange = new EventEmitter<string[]>();

    selectOption(option: string): void {
        const index = this.selectedOptions.indexOf(option);
        if (index === -1) {
            if (option === '-1' || option === 'null') {
                return;
            }
            this.selectedOptions.push(option);
            this.selectedOptionsChange.emit(this.selectedOptions);
        }
    }

    deleteOption(option: string): void {
        const index = this.selectedOptions.indexOf(option);
        if (index !== -1) {
            this.selectedOptions.splice(index, 1);
            this.selectedOptionsChange.emit(this.selectedOptions);
        }
    }

    getOptionName(value: string): string {
        if (this.options) {
            const option = this.options.find(opt => opt.id === value);
            return option ? option.name : value;
        }
        return '';
    }
}
