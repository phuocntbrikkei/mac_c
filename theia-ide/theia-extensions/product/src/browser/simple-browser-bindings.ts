/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { interfaces } from '@theia/core/shared/inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { bindViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import URI from '@theia/core/lib/common/uri';
import { LocationMapper } from '@theia/mini-browser/lib/browser/location-mapper-service';
import { MiniBrowser, MiniBrowserOptions } from '@theia/mini-browser/lib/browser/mini-browser';
import { LocalhostOnlyLocationMapper } from './localhost-only-location-mapper';
import {
    SimpleBrowserViewContribution,
    SIMPLE_BROWSER_VIEW_ID,
    SIMPLE_BROWSER_START_PAGE,
    SIMPLE_BROWSER_ICON
} from './simple-browser-view-contribution';

/**
 * Registers the localhost-only Mini Browser location gate and the persistent
 * "Simple Browser" entry in the left activity bar.
 *
 * Called from both the browser and the electron frontend modules, because Theia
 * loads only the `frontendElectron` module for the desktop app (the plain
 * `frontend` module is used for the browser target).
 */
export function bindSimpleBrowser(bind: interfaces.Bind): void {
    // Mini Browser navigation (incl. the address bar): only localhost / 127.0.0.1.
    bind(LocationMapper).to(LocalhostOnlyLocationMapper).inSingletonScope();

    bind(WidgetFactory).toDynamicValue(({ container }) => ({
        id: SIMPLE_BROWSER_VIEW_ID,
        createWidget: () => {
            const child = container.createChild();
            child.bind(MiniBrowserOptions).toConstantValue({ uri: new URI(SIMPLE_BROWSER_START_PAGE || 'about:blank') });
            const widget = child.get(MiniBrowser);
            widget.id = SIMPLE_BROWSER_VIEW_ID;
            widget.title.label = 'Simple Browser';
            widget.title.caption = 'Simple Browser';
            widget.title.iconClass = SIMPLE_BROWSER_ICON;
            widget.title.closable = true;
            widget.setProps({
                startPage: SIMPLE_BROWSER_START_PAGE,
                toolbar: 'show',
                name: 'Simple Browser',
                iconClass: SIMPLE_BROWSER_ICON,
                resetBackground: true
            });
            return widget;
        }
    })).inSingletonScope();

    bindViewContribution(bind, SimpleBrowserViewContribution);
    bind(FrontendApplicationContribution).toService(SimpleBrowserViewContribution);
}
