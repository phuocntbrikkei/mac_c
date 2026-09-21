/********************************************************************************
 * Rikkei Ide — theo dõi hoạt động code của SV, gửi về SC.
 * Bắt: mọi thay đổi text (delta) + snapshot khi save + tạo/xoá/sửa file +
 * mở/đóng phiên. Gom batch (5s hoặc >=200 sự kiện) rồi POST /api/ide/activity
 * kèm studentRkId + workspace. SC lưu JSONL theo SV/ngày.
 ********************************************************************************/

import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { MonacoWorkspace } from '@theia/monaco/lib/browser/monaco-workspace';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { FileChangeType } from '@theia/filesystem/lib/common/files';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { RikkeiAuthService } from './rikkei-auth-service';

const FLUSH_MS = 5000;
const FLUSH_AT = 200;          // gửi ngay khi đủ số sự kiện
const MAX_BUFFER = 5000;       // trần buffer khi gửi hụt
const SNAPSHOT_MAX = 512 * 1024; // > mức này thì chỉ ghi metadata, bỏ nội dung

@injectable()
export class RikkeiCodeActivityContribution implements FrontendApplicationContribution {

    @inject(MonacoWorkspace)
    protected readonly monaco: MonacoWorkspace;

    @inject(FileService)
    protected readonly files: FileService;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(RikkeiAuthService)
    protected readonly auth: RikkeiAuthService;

    protected buffer: Record<string, unknown>[] = [];
    protected workspace = '';
    protected sending = false;

    onStart(): void {
        void this.refreshWorkspace();
        this.push({ k: 'session', op: 'open' });

        // Mọi thay đổi text (delta theo offset — đủ để replay).
        this.monaco.onDidChangeTextDocument(e => {
            if (!this.tracked(e.model.uri)) { return; }
            this.push({
                k: 'edit',
                f: e.model.uri,
                v: e.model.version,
                c: e.contentChanges.map(ch => ({ o: ch.rangeOffset, l: ch.rangeLength, t: ch.text })),
            });
        });

        // Save -> snapshot toàn văn (cắt nếu quá lớn).
        this.monaco.onDidSaveTextDocument(model => {
            if (!this.tracked(model.uri)) { return; }
            const text = model.getText();
            const ev: Record<string, unknown> = { k: 'save', f: model.uri, lang: model.languageId, size: text.length };
            if (text.length <= SNAPSHOT_MAX) {
                ev.content = text;
            } else {
                ev.truncated = true;
            }
            this.push(ev);
        });

        this.monaco.onDidOpenTextDocument(m => { if (this.tracked(m.uri)) { this.push({ k: 'openFile', f: m.uri }); } });
        this.monaco.onDidCloseTextDocument(m => { if (this.tracked(m.uri)) { this.push({ k: 'closeFile', f: m.uri }); } });

        // Tạo/xoá/sửa file trên đĩa.
        this.files.onDidFilesChange(e => {
            for (const c of e.changes) {
                const uri = c.resource.toString();
                if (!this.tracked(uri)) { continue; }
                const op = c.type === FileChangeType.ADDED ? 'add'
                    : c.type === FileChangeType.DELETED ? 'del' : 'upd';
                this.push({ k: 'file', op, f: uri });
            }
        });

        setInterval(() => void this.flush(), FLUSH_MS);
        window.addEventListener('beforeunload', () => {
            this.push({ k: 'session', op: 'close' });
            void this.flush(true);
        });
    }

    // Chỉ theo dõi file THẬT trong workspace. Bỏ output channel/virtual doc (scheme
    // khác file:, ví dụ "Python Environments" đẻ ra hàng chục nghìn ký tự rác) và
    // thư mục ẩn/hệ thống (.theia, .git, node_modules...).
    protected tracked(uri: string): boolean {
        if (typeof uri !== 'string' || !uri.toLowerCase().startsWith('file:')) { return false; }
        if (/(^|[\\/])(\.rikkei-ide|\.theia|\.vscode|\.git|node_modules|__pycache__|\.idea|\.cache|\.pytest_cache)([\\/]|$)/i.test(decodeURIComponent(uri))) { return false; }
        return true;
    }

    protected async refreshWorkspace(): Promise<void> {
        try {
            const roots = await this.workspaceService.roots;
            this.workspace = roots[0]?.resource.toString() || '';
        } catch {
            this.workspace = '';
        }
    }

    protected push(ev: Record<string, unknown>): void {
        ev.t = Date.now();
        this.buffer.push(ev);
        if (this.buffer.length > MAX_BUFFER) {
            this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
        }
        if (this.buffer.length >= FLUSH_AT) {
            void this.flush();
        }
    }

    protected async flush(keepalive = false): Promise<void> {
        if (this.sending || this.buffer.length === 0) {
            return;
        }
        const rk = this.auth.getStudentRkId();
        const base = this.auth.getScBaseUrl().replace(/\/+$/, '');
        if (!rk || !base) {
            return; // chưa đăng nhập / chưa cấu hình -> không gửi
        }
        if (!this.workspace) {
            await this.refreshWorkspace();
        }
        const events = this.buffer;
        this.buffer = [];
        this.sending = true;
        try {
            const res = await fetch(`${base}/api/ide/activity`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentRkId: rk, workspace: this.workspace, events }),
                keepalive,
            });
            if (!res.ok) {
                throw new Error('http ' + res.status);
            }
        } catch {
            // gửi hụt -> trả lại buffer (giữ trần) để lần sau thử lại
            this.buffer = events.concat(this.buffer).slice(-MAX_BUFFER);
        } finally {
            this.sending = false;
        }
    }
}
