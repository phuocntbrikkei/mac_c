/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { injectable } from '@theia/core/shared/inversify';
import { codicon } from '@theia/core/lib/browser';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { FrontendApplication } from '@theia/core/lib/browser/frontend-application';
import { MiniBrowser } from '@theia/mini-browser/lib/browser/mini-browser';

export const SIMPLE_BROWSER_VIEW_ID = 'simple-browser-view';
export const SIMPLE_BROWSER_TOGGLE_COMMAND_ID = 'simpleBrowser:toggle';
/** Empty start page keeps the address bar visible without loading anything on startup. */
export const SIMPLE_BROWSER_START_PAGE = '';
export const SIMPLE_BROWSER_ICON = codicon('globe');

/**
 * Adds a permanent "Simple Browser" entry to the left activity bar.
 * The underlying widget is the (localhost-only) Mini Browser, so any
 * navigation is still gated to localhost / 127.0.0.1.
 */
@injectable()
export class SimpleBrowserViewContribution extends AbstractViewContribution<MiniBrowser>
    implements FrontendApplicationContribution {

    constructor() {
        super({
            widgetId: SIMPLE_BROWSER_VIEW_ID,
            widgetName: 'Simple Browser',
            defaultWidgetOptions: { area: 'left', rank: 100 },
            toggleCommandId: SIMPLE_BROWSER_TOGGLE_COMMAND_ID
        });
    }

    // `initializeLayout` only runs for a fresh layout; use `onDidInitializeLayout`
    // so the icon is (re)added on every startup, even when a previous layout is restored.
    async onDidInitializeLayout(_app: FrontendApplication): Promise<void> {
        await this.ensureView();
    }

    async initializeLayout(_app: FrontendApplication): Promise<void> {
        await this.ensureView();
    }

    protected async ensureView(): Promise<void> {
        // Attach the widget to the left panel so its icon is always present in
        // the activity bar, but don't steal focus or expand the panel on startup.
        // `openView` is a no-op if the widget is already attached.
        await this.openView({ activate: false, reveal: false });
    }
}
