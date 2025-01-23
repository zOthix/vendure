/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { AccountRegistrationEvent, NativeAuthenticationMethod } from '@vendure/core';

import { EmailEventListener } from '../event-listener';

import { EmailEventHandler } from './event-handler';
import { mockAccountRegistrationEvent } from './mock-events';

/**
 * Extending the default email handlers.
 */

export const customerRegistrationHandler = new EmailEventListener('customer-registration')
    .on(AccountRegistrationEvent)
    .filter(event => !!event.user.getNativeAuthenticationMethod().identifier)
    .filter(event => {
        const nativeAuthMethod = event.user.authenticationMethods.find(
            m => m instanceof NativeAuthenticationMethod,
        ) as NativeAuthenticationMethod | undefined;
        return (nativeAuthMethod && !!nativeAuthMethod.identifier) || false;
    })
    .setRecipient(event => event.user.identifier)
    .setFrom('{{ fromAddress }}')
    .setSubject('Welcome to the Business Club')
    .setMockEvent(mockAccountRegistrationEvent);

export const eventHandlers: Array<EmailEventHandler<any, any>> = [customerRegistrationHandler];
