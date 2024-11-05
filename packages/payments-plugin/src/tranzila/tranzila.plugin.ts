import type { ListParameters } from '@mollie/api-client/dist/types/src/binders/methods/parameters';
import {
    Injector,
    Order,
    PluginCommonModule,
    RequestContext,
    RuntimeVendureConfig,
    SocketGateway,
    VendurePlugin,
} from '@vendure/core';

import { TranzilaController } from './tranzila.controller';

export type AdditionalEnabledPaymentMethodsParams = Partial<Omit<ListParameters, 'resource'>>;

export interface TranzilaPluginOptions {
    vendureHost: string;
    enabledPaymentMethodsParams?: (
        injector: Injector,
        ctx: RequestContext,
        order: Order | null,
    ) => AdditionalEnabledPaymentMethodsParams | Promise<AdditionalEnabledPaymentMethodsParams>;
}

@VendurePlugin({
    imports: [PluginCommonModule],
    controllers: [TranzilaController],
    providers: [SocketGateway],
})
export class TranzilaPlugin {
    static options: TranzilaPluginOptions;

    static init(options: TranzilaPluginOptions): typeof TranzilaPlugin {
        this.options = options;
        return TranzilaPlugin;
    }
}
