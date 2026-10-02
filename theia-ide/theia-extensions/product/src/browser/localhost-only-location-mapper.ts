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
import { LocationMapper } from '@theia/mini-browser/lib/browser/location-mapper-service';
import {
    assertAllowedLocalHttpUrl,
    isAllowedLocalHttpUrl,
    looksLikeRemoteWebLocation,
} from './localhost-url-guard';

// Chống spam khi mini-browser thử map nhiều lần cho cùng một địa chỉ bị chặn.
const NOTIFY_THROTTLE_MS = 1500;

/**
 * Highest-priority mapper: only localhost / 127.0.0.1 http(s) may load in Mini Browser.
 */
@injectable()
export class LocalhostOnlyLocationMapper implements LocationMapper {

    @inject(MessageService)
    protected readonly messageService: MessageService;

    protected lastNotifyAt = 0;

    canHandle(location: string): number {
        return looksLikeRemoteWebLocation(location) ? 2000 : 0;
    }

    map(location: string): string {
        // Báo cho người dùng biết vì sao trang không mở được, thay vì chặn im lặng.
        if (!isAllowedLocalHttpUrl(location)) {
            this.notifyBlocked(location);
        }
        return assertAllowedLocalHttpUrl(location);
    }

    protected notifyBlocked(location: string): void {
        const now = Date.now();
        if (now - this.lastNotifyAt < NOTIFY_THROTTLE_MS) {
            return;
        }
        this.lastNotifyAt = now;
        this.messageService.warn(
            `Trang bị chặn trong Rikkei Ide: ${location}. Chỉ mở được localhost, domain "rikkei", và các site đã được cấu hình cho phép.`
        );
    }
}
