import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionActivity, SessionInfo, SessionStatus } from "../api";
import { isSessionActive } from "../../../shared/activity";
import { isCachedNewSessionInfo } from "../cachedNewSessions";
import { actionMenuPanelStyle } from "./actionMenu";
import { renderActionActivityIndicator } from "./activityBadge";
import { listStyles } from "./shared";

const PROJECT_COLORS = [
  "#4fc3f7", // light blue
  "#ffb74d", // orange
  "#81c784", // green
  "#e57373", // red
  "#ba68c8", // purple
  "#4dd0e1", // cyan
  "#ffd54f", // amber (more visible than yellow)
  "#f06292", // pink
  "#a1887f", // brown
  "#90a4ae", // blue grey
];

function projectColor(cwd: string, allCwds: string[]): string {
  const unique = [...new Set(allCwds)].sort();
  const index = unique.indexOf(cwd);
  if (index < 0) return PROJECT_COLORS[0] ?? "#90a4ae";
  return PROJECT_COLORS[index % PROJECT_COLORS.length] ?? PROJECT_COLORS[0] ?? "#90a4ae";
}

function sessionLabel(session: SessionInfo): string {
  if (session.name !== undefined && session.name !== "") return session.name;
  if (session.firstMessage !== "") return session.firstMessage;
  return session.id.slice(0, 8);
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${String(diffMin)}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${String(diffHour)}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${String(diffDay)}d ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${String(diffWeek)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shortPath(fullPath: string): string {
  const parts = fullPath.split("/").filter(Boolean);
  if (parts.length <= 2) return fullPath;
  return parts.slice(-2).join("/");
}

@customElement("flat-session-list")
export class FlatSessionList extends LitElement {
  @property({ attribute: false }) sessions: SessionInfo[] = [];
  @property({ attribute: false }) selectedSessionId?: string;
  @property({ attribute: false }) onSelect?: (session: SessionInfo) => void;
  @property({ attribute: false }) onArchive?: (session: SessionInfo) => void;
  @property({ attribute: false }) onArchiveWithDescendants?: (session: SessionInfo) => void;
  @property({ attribute: false }) onRestore?: (session: SessionInfo) => void;
  @property({ attribute: false }) onDeleteArchived?: (session: SessionInfo) => void;
  @property({ attribute: false }) onDetachParent?: (session: SessionInfo) => void;
  @property({ attribute: false }) statuses: Record<string, SessionStatus> = {};
  @property({ attribute: false }) activities: Record<string, SessionActivity> = {};
  @property({ attribute: false }) sending: Record<string, true> = {};

  @state() private searchQuery = "";
  @state() private openMenuSessionId: string | undefined;
  @state() private menuStyle = "";
  @state() private viewedSessionIds = new Set<string>();

  private readonly onDocumentClick = (event: MouseEvent) => {
    if (event.composedPath().includes(this)) return;
    this.openMenuSessionId = undefined;
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.onDocumentClick);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
    super.disconnectedCallback();
  }

  /** Whether the session has unread updates (finished work but user hasn't viewed it yet). */
  private hasUnreadActivity(session: SessionInfo): boolean {
    if (isCachedNewSessionInfo(session) || session.archived === true) return false;
    if (this.viewedSessionIds.has(session.id)) return false;
    // Session is tracked as active in the daemon but not currently doing work → just finished
    if (session.active !== true) return false;
    const status = this.statuses[session.id];
    const activity = this.activities[session.id];
    return !isSessionActive(status, activity);
  }

  private renderActivity(session: SessionInfo): unknown {
    if (isCachedNewSessionInfo(session) || session.archived === true) return null;
    const status = this.statuses[session.id];
    const activity = this.activities[session.id];
    const isSending = this.sending[session.id] === true;
    if (isSending) return renderActionActivityIndicator("sending", "Sending message");
    if (isSessionActive(status, activity)) return renderActionActivityIndicator("session", "Session active");
    if (this.hasUnreadActivity(session)) return renderActionActivityIndicator("session", "Finished — new activity");
    return null;
  }

  private toggleMenu(sessionId: string, target: EventTarget | null): void {
    if (this.openMenuSessionId === sessionId) {
      this.openMenuSessionId = undefined;
      return;
    }
    this.menuStyle = actionMenuPanelStyle(target);
    this.openMenuSessionId = sessionId;
  }

  private get filteredSessions(): SessionInfo[] {
    const sorted = [...this.sessions].sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
    if (!this.searchQuery.trim()) return sorted;
    const q = this.searchQuery.toLowerCase();
    return sorted.filter(
      (s) =>
        sessionLabel(s).toLowerCase().includes(q) ||
        s.cwd.toLowerCase().includes(q),
    );
  }

  override render() {
    const sessions = this.filteredSessions;
    const allCwds = this.sessions.map((s) => s.cwd);

    return html`
      <div class="flat-sessions">
        <div class="header">
          <h2>All Sessions</h2>
          <div class="search-box">
            <input
              type="search"
              placeholder="Search sessions..."
              .value=${this.searchQuery}
              @input=${(e: InputEvent) => {
                if (!(e.target instanceof HTMLInputElement)) return;
                this.searchQuery = e.target.value;
              }}
              @keydown=${(e: KeyboardEvent) => { e.stopPropagation(); }}
            />
          </div>
        </div>
        <div class="session-count">${sessions.length} session${sessions.length === 1 ? "" : "s"}</div>
        ${sessions.length === 0
          ? html`<div class="empty">No sessions found</div>`
          : html`
              <div class="list">
                ${sessions.map(
                  (session) => html`
                    <div
                      class="action-row ${this.selectedSessionId === session.id ? "selected" : ""} ${session.archived === true ? "archived" : ""} ${this.hasUnreadActivity(session) ? "has-updates" : ""}"
                      style="--project-tint: ${projectColor(session.cwd, allCwds)}"
                      tabindex="0"
                      title=${session.path}
                      @click=${() => { this.viewedSessionIds.add(session.id); this.onSelect?.(session); }}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          this.viewedSessionIds.add(session.id);
                          this.onSelect?.(session);
                        }
                      }}
                    >
                      <div class="action-main">
                        <span class="action-name" dir="auto">${sessionLabel(session)}</span>
                        <small>
                          <span class="session-cwd">${shortPath(session.cwd)}</span>
                          <span class="session-messages">· ${session.messageCount} messages</span>
                          <span class="session-time">· ${formatRelativeTime(session.modified)}</span>
                        </small>
                      </div>
                      <div class="action-menu">
                        ${this.renderActivity(session)}
                        <button class="action-menu-toggle" title="Session actions" @click=${(event: MouseEvent) => { event.stopPropagation(); this.toggleMenu(session.id, event.currentTarget); }}>⋯</button>
                        ${this.openMenuSessionId === session.id ? html`
                          <div class="action-menu-panel" style=${this.menuStyle}>
                            ${isCachedNewSessionInfo(session)
                              ? html`<button title="Delete browser-cached new session" @click=${() => { this.openMenuSessionId = undefined; this.onDeleteArchived?.(session); }}>Delete</button>`
                              : session.archived === true
                                ? html`
                                  <button title="Restore session" @click=${() => { this.openMenuSessionId = undefined; this.onRestore?.(session); }}>Restore</button>
                                  <button class="danger" title="Permanently delete archived session" @click=${() => { this.openMenuSessionId = undefined; this.onDeleteArchived?.(session); }}>Delete archived session</button>
                                `
                                : html`
                                  <button title="Archive session" @click=${() => { this.openMenuSessionId = undefined; this.onArchive?.(session); }}>Archive</button>
                                  ${session.parentSessionPath !== undefined ? html`<button title="Detach from parent" @click=${() => { this.openMenuSessionId = undefined; this.onDetachParent?.(session); }}>Detach from parent</button>` : null}
                                `
                            }
                          </div>
                        ` : null}
                      </div>
                    </div>
                  `,
                )}
              </div>
            `}
      </div>
    `;
  }

  static override styles = [
    listStyles,
    css`
      :host { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
      .flat-sessions { display: flex; flex-direction: column; min-height: 0; overflow: hidden; flex: 1; }

      .header { flex: 0 0 auto; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--pi-border); }
      .header h2 { flex: 0 0 auto; margin: 0; font-size: 16px; font-weight: 600; color: var(--pi-text); }
      .search-box { flex: 1 1 auto; min-width: 0; }
      .search-box input { width: 100%; box-sizing: border-box; border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 7px 10px; font-size: 13px; outline: none; }
      .search-box input:focus { border-color: var(--pi-accent); }

      .session-count { flex: 0 0 auto; padding: 6px 16px; font-size: 12px; color: var(--pi-muted); border-bottom: 1px solid var(--pi-border-muted); }

      .list { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 4px; }

      .action-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        margin: 2px 0;
        cursor: pointer;
      }

      /* Project-colored left border and background tint */
      .action-row .action-main {
        border-left: 3px solid var(--project-tint);
        background: color-mix(in srgb, var(--project-tint) 8%, var(--pi-surface));
        padding-left: 12px;
      }
      .action-row.selected .action-main {
        border-color: var(--pi-accent);
        background: var(--pi-selection-bg);
      }
      /* Unread updates indicator: highlight the left border to signal new activity */
      .action-row.has-updates .action-main {
        border-left-color: color-mix(in srgb, var(--project-tint) 60%, var(--pi-accent));
        box-shadow: inset 3px 0 0 var(--project-tint);
      }

      .action-name { font-size: 14px; color: var(--pi-text); }

      .action-main small { margin-top: 2px; font-size: 11px; }
      .session-cwd { color: var(--pi-dim); }
      .session-messages { color: var(--pi-muted); }
      .session-time { color: var(--pi-dim); font-size: 11px; white-space: nowrap; }

      .action-menu { display: flex; align-items: center; gap: 6px; padding: 0 8px; }
      .action-menu-toggle { flex: 0 0 auto; background: none; border: none; color: var(--pi-muted); cursor: pointer; font-size: 16px; line-height: 1; padding: 2px 4px; border-radius: 4px; }
      .action-menu-toggle:hover { background: var(--pi-surface-hover); color: var(--pi-text); }

      .empty { padding: 40px 16px; text-align: center; color: var(--pi-muted); font-size: 14px; }

      /* Context menu panel */
      .action-menu-panel { position: fixed; z-index: 1000; background: var(--pi-surface); border: 1px solid var(--pi-border); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.15); overflow-y: auto; display: flex; flex-direction: column; padding: 4px; }
      .action-menu-panel button { display: block; width: 100%; text-align: left; background: none; border: none; color: var(--pi-text); padding: 8px 12px; font-size: 13px; cursor: pointer; border-radius: 4px; white-space: nowrap; }
      .action-menu-panel button:hover { background: var(--pi-surface-hover); }
      .action-menu-panel button.danger { color: var(--pi-danger); }

      /* Override listStyles padding on section since we manage our own layout */
      section { padding: 0; }
    `,
  ];
}
