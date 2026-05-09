import { LitElement, html, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { CommandOption } from "../api";
import { commandPickerStyles } from "./shared";

@customElement("command-picker")
export class CommandPicker extends LitElement {
  @property() override title = "Select";
  @property({ attribute: false }) options: CommandOption[] = [];
  @property({ attribute: false }) onPick?: (value: string) => void;
  @property({ attribute: false }) onCancel?: () => void;
  @state() private selectedIndex = 0;

  override render() {
    return html`
      <div class="backdrop" @mousedown=${() => this.onCancel?.()}>
        <section @mousedown=${(event: MouseEvent) => { event.stopPropagation(); }}>
          <header>
            <strong>${this.title}</strong>
            <button @click=${() => this.onCancel?.()}>×</button>
          </header>
          <div class="options" @keydown=${(event: KeyboardEvent) => { this.handleKeyDown(event); }} tabindex="0">
            ${this.options.map((option, index) => html`
              <button class=${index === this.selectedIndex ? "selected" : ""} @click=${() => this.onPick?.(option.value)}>
                <span>${option.label}</span>
                ${option.description !== undefined && option.description !== "" ? html`<small>${option.description}</small>` : null}
              </button>
            `)}
          </div>
        </section>
      </div>
    `;
  }

  override firstUpdated() {
    this.renderRoot.querySelector<HTMLElement>(".options")?.focus();
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has("selectedIndex") || changed.has("options")) this.scrollSelectedIntoView();
  }

  private scrollSelectedIntoView() {
    this.renderRoot.querySelector<HTMLElement>(".options button.selected")?.scrollIntoView({ block: "nearest" });
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      this.onCancel?.();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      if (this.options.length > 0) this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (this.options.length > 0) this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = this.options[this.selectedIndex];
      if (option) this.onPick?.(option.value);
    }
  }

  static override styles = commandPickerStyles;
}
