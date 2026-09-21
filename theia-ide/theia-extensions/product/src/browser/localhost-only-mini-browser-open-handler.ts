/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { inject, injectable } from '@theia/core/shared/inversify';
import { MessageService } from '@theia/core/lib/common/message-service';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';
import { MiniBrowser } from '@theia/mini-browser/lib/browser/mini-browser';
import {
    assertAllowedLocalHttpUrl,
    looksLikeRemoteWebLocation,
    LocalhostOnlyError,
} from './localhost-url-guard';

/**
 * Mini Browser / Preview URL entry points —
 * localhost, "rikkei" domains, and Google Translate only.
 */
@injectable()
export class LocalhostOnlyMiniBrowserOpenHandler extends MiniBrowserOpenHandler {

    @inject(MessageService)
    protected readonly messages: MessageService;

    override async openPreview(startPage: string): Promise<MiniBrowser> {
        try {
            if (looksLikeRemoteWebLocation(startPage)) {
                startPage = assertAllowedLocalHttpUrl(startPage);
            }
            return await super.openPreview(startPage);
        } catch (err) {
            this.report(err, startPage);
            throw err;
        }
    }

    protected override async openUrl(arg?: string): Promise<void> {
        try {
            if (arg && looksLikeRemoteWebLocation(arg)) {
                arg = assertAllowedLocalHttpUrl(arg);
            }
            return await super.openUrl(arg);
        } catch (err) {
            this.report(err, arg ?? '');
        }
    }

    protected report(err: unknown, url: string): void {
        const message = err instanceof LocalhostOnlyError
            ? err.message
            : (err instanceof Error ? err.message : `Blocked URL: ${url}`);
        this.messages.error(`${message}`);
    }
}
