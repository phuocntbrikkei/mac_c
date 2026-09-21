/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { inject, injectable } from '@theia/core/shared/inversify';
import URI from '@theia/core/lib/common/uri';
import { MessageService } from '@theia/core/lib/common/message-service';
import { ExternalAppOpenHandler } from '@theia/core/lib/electron-browser/window/external-app-open-handler';
import { isAllowedLocalHttpUrl } from '../browser/localhost-url-guard';

/**
 * Blocks opening external http(s) URLs in the system browser unless localhost.
 */
@injectable()
export class LocalhostOnlyExternalAppOpenHandler extends ExternalAppOpenHandler {

    @inject(MessageService)
    protected readonly messages: MessageService;

    override async open(uri: URI): Promise<undefined> {
        if (uri.scheme === 'http' || uri.scheme === 'https') {
            const url = uri.toString(true);
            if (!isAllowedLocalHttpUrl(url)) {
                this.messages.error(
                    'Không được mở website bên ngoài. Chỉ cho phép localhost / 127.0.0.1, domain có "rikkei", hoặc Google Dịch.'
                );
                return undefined;
            }
        }
        return super.open(uri);
    }
}
