/********************************************************************************
 * Copyright (C) 2026 Eclipse Foundation and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 *
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

const LOCAL_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '[::1]',
    '::1',
    '0.0.0.0',
]);

/** Explicit allowlist for Google Translate (VN + common redirect host). */
const ALLOWED_TRANSLATE_HOSTS = new Set([
    'translate.google.com.vn',
    'translate.google.com',
]);

/**
 * Allowlist host cấu hình từ SC (tab IDE trong cấu hình giám sát). Nạp lúc khởi
 * động qua {@link setExtraAllowedHosts}; nếu IDE không lấy được cấu hình thì danh
 * sách này rỗng -> chỉ còn localhost + rikkei (giữ khóa an toàn, không nới lỏng).
 */
let extraAllowedHosts: string[] = [];

export function setExtraAllowedHosts(hosts: string[]): void {
    extraAllowedHosts = (hosts || [])
        .map(h => h.trim().toLowerCase())
        .filter(h => h.length > 0);
}

/** Host khớp allowlist SC: trùng khít hoặc là subdomain (vd "python.org" khớp "docs.python.org"). */
export function isExtraAllowedHostname(hostname: string): boolean {
    const host = hostname.trim().toLowerCase();
    return extraAllowedHosts.some(h => host === h || host.endsWith('.' + h));
}

export class LocalhostOnlyError extends Error {
    constructor(url: string) {
        super(
            `Blocked URL: ${url}. Chỉ cho phép localhost / 127.0.0.1, domain có "rikkei", hoặc Google Dịch.`
        );
        this.name = 'LocalhostOnlyError';
    }
}

export function normalizeHttpUrl(location: string): string {
    const trimmed = location.trim();
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
        return trimmed;
    }
    return `http://${trimmed}`;
}

export function isLocalhostHostname(hostname: string): boolean {
    const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
    if (LOCAL_HOSTS.has(host) || LOCAL_HOSTS.has(hostname.trim().toLowerCase())) {
        return true;
    }
    // 127.0.0.0/8 loopback
    if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
        return true;
    }
    return false;
}

/**
 * Hostnames containing "rikkei" (e.g. portal.rikkei.edu.vn, sv.rikkeiraia.org).
 */
export function isRikkeiHostname(hostname: string): boolean {
    return hostname.trim().toLowerCase().includes('rikkei');
}

/**
 * Google Translate hosts used for exam translation.
 */
export function isAllowedTranslateHostname(hostname: string): boolean {
    return ALLOWED_TRANSLATE_HOSTS.has(hostname.trim().toLowerCase());
}

/**
 * Returns true when the URL is http(s) to an allowed host:
 * localhost / 127.0.0.1, any host containing "rikkei", or Google Translate.
 * Non-http(s) schemes return false (caller may allow file: separately).
 */
export function isAllowedLocalHttpUrl(location: string): boolean {
    try {
        const url = new URL(normalizeHttpUrl(location));
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return false;
        }
        const host = url.hostname;
        return isLocalhostHostname(host)
            || isRikkeiHostname(host)
            || isAllowedTranslateHostname(host)
            || isExtraAllowedHostname(host);
    } catch {
        return false;
    }
}

export function assertAllowedLocalHttpUrl(location: string): string {
    const normalized = normalizeHttpUrl(location);
    if (!isAllowedLocalHttpUrl(normalized)) {
        throw new LocalhostOnlyError(normalized);
    }
    return normalized;
}

export function looksLikeRemoteWebLocation(location: string): boolean {
    const trimmed = location.trim();
    if (/^https?:\/\//i.test(trimmed)) {
        return true;
    }
    // Bare host like google.com / localhost:3000 (not a file path)
    if (!trimmed.includes('://') && !/[\\/]/.test(trimmed) && /^(localhost|127\.|[\w-]+(\.[\w-]+)+)(:\d+)?(\/.*)?$/i.test(trimmed)) {
        return true;
    }
    return false;
}
