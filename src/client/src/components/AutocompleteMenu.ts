import { LitElement, html, type PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";
import { autocompleteStyles, type CompletionItem } from "./shared";

@customElement("autocomplete-menu")
export class AutocompleteMenu extends LitElement {
  @property({ attribute: false }) items: CompletionItem[] = [];
  @property({ type: Number }) selectedIndex = 0;
  @property({ attribute: false }) onPick?: (item: CompletionItem) => void;

  override render() {
    if (!this.items.length) return null;
    return html`
      <div class="menu">
        ${this.items.map((item, index) => html`
          <button class=${index === this.selectedIndex ? "selected" : ""} @mousedown=${(event: MouseEvent) => { event.preventDefault(); this.onPick?.(item); }}>
            <strong>${item.insertText}</strong>
            <span>${item.detail}</span>
            ${item.description !== undefined && item.description !== "" ? html`<small>${item.description}</small>` : null}
          </button>
        `)}
      </div>
    `;
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has("selectedIndex") || changed.has("items")) this.scrollSelectedIntoView();
  }

  private scrollSelectedIntoView() {
    this.renderRoot.querySelector<HTMLElement>("button.selected")?.scrollIntoView({ block: "nearest" });
  }

  static override styles = autocompleteStyles;
}
