/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

import { ContainerModule } from '@theia/core/shared/inversify';
import { ExternalAppOpenHandler } from '@theia/core/lib/electron-browser/window/external-app-open-handler';
import { ElectronIpcConnectionProvider } from '@theia/core/lib/electron-browser/messaging/electron-ipc-connection-source';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';
import { LocalhostOnlyMiniBrowserOpenHandler } from '../browser/localhost-only-mini-browser-open-handler';
import { LocalhostOnlyExternalAppOpenHandler } from './localhost-only-external-app-open-handler';
import { bindTheiaIdeProductFrontend } from '../browser/theia-ide-frontend-bindings';
import { RikkeiIdeAuthMain, RIKKEI_IDE_AUTH_PATH } from '../common/rikkei-ide-auth';

/**
 * Electron entry module. Theia loads only this `frontendElectron` module for the
 * desktop app (not the plain `frontend` module), so all product frontend bindings
 * are applied here plus the electron-only localhost browsing handlers.
 */
export default new ContainerModule((bind, _unbind, isBound, rebind) => {
    bindTheiaIdeProductFrontend(bind, isBound, rebind);

    // Proxy tới dịch vụ đăng nhập LMS Portal ở electron-main (chỉ có ở bản desktop).
    bind(RikkeiIdeAuthMain).toDynamicValue(ctx =>
        ElectronIpcConnectionProvider.createProxy(ctx.container, RIKKEI_IDE_AUTH_PATH)
    ).inSingletonScope();

    // Electron-only: keep external / system-browser opening restricted to localhost.
    if (isBound(MiniBrowserOpenHandler)) {
        rebind(MiniBrowserOpenHandler).to(LocalhostOnlyMiniBrowserOpenHandler).inSingletonScope();
    }
    if (isBound(ExternalAppOpenHandler)) {
        rebind(ExternalAppOpenHandler).to(LocalhostOnlyExternalAppOpenHandler).inSingletonScope();
    }
});
