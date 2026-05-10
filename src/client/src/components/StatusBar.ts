import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SessionStatus, Workspace } from "../api";
import { formatCost, formatTokenCount } from "../utils/format";
import { statusBarStyles } from "./shared";

@customElement("status-bar")
export class StatusBar extends LitElement {
  @property({ attribute: false }) status?: SessionStatus;
  @property({ attribute: false }) workspace?: Workspace;
  @property({ attribute: false }) onSelectModel?: () => void;
  @property({ attribute: false }) onCycleModel?: (direction: "forward" | "backward") => void;
  @property({ attribute: false }) onSelectThinking?: () => void;
  @property({ attribute: false }) onCycleThinking?: () => void;

  override render() {
    const status = this.status;
    if (status === undefined) return html`<div class="bar muted">No session status yet</div>`;
    const model = status.model?.id ?? "no model";
    const provider = status.model?.provider !== undefined && status.model.provider !== "" ? `${status.model.provider}/` : "";
    const context = status.contextUsage;
    const contextText = context
      ? context.percent == null
        ? `context ${formatTokenCount(context.contextWindow)}`
        : `${context.percent.toFixed(1)}%/${formatTokenCount(context.contextWindow)}`
      : "context unknown";
    const tokens = status.tokens;
    return html`
      <div class="bar">
        <span title=${this.workspace?.path ?? ""}>${this.workspace?.label ?? "workspace"}</span>
        <span class="control-group">
          <button title="Previous model" @click=${() => this.onCycleModel?.("backward")}>‹</button>
          <button title="Select model" @click=${() => this.onSelectModel?.()}>${provider}${model}</button>
          <button title="Next model" @click=${() => this.onCycleModel?.("forward")}>›</button>
        </span>
        <span class="control-group">
          <button title="Cycle thinking level" @click=${() => this.onCycleThinking?.()}>thinking ${status.thinkingLevel ?? "off"}</button>
          <button title="Select thinking level" @click=${() => this.onSelectThinking?.()}>⌄</button>
        </span>
        <span>↑${formatTokenCount(tokens.input)}</span>
        <span>↓${formatTokenCount(tokens.output)}</span>
        <span>${contextText}</span>
        <span>${formatCost(status.cost)}</span>
        ${status.pendingMessageCount > 0 ? html`<span>${String(status.pendingMessageCount)} queued</span>` : null}
      </div>
    `;
  }

  static override styles = statusBarStyles;
}
