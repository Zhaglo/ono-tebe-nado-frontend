import { Component } from "./base/Component";
import { createElement, ensureAllElements, ensureElement, formatNumber } from ".././utils/utils";
import { EventEmitter } from "./base/events";

interface IBasketView {
    items: HTMLElement[];
    total: number;
    selected: string[];
}

export class Basket extends Component<IBasketView> {
    protected el_list: HTMLElement;
    protected el_total: HTMLElement;
    protected el_action: HTMLButtonElement;

    constructor(container: HTMLElement, protected events: EventEmitter) {
        super(container);

        this.el_list = ensureElement<HTMLElement>('.basket__list', this.container);
        this.el_total = this.container.querySelector('.basket__total');
        this.el_action = this.container.querySelector('.basket__action');

        if (this.el_action) {
            this.el_action.addEventListener('click', () => {
                events.emit('order:open');
            });
        }

        this.items = [];
    }

    set items(items: HTMLElement[]) {
        if (items.length) {
            this.el_list.replaceChildren(...items);
        } else {
            this.el_list.replaceChildren(createElement<HTMLParagraphElement>('p', {
                textContent: 'Корзина пуста'
            }));
        }
    }

    set selected(items: string[]) {
        if (items.length) {
            this.setDisabled(this.el_action, false);
        } else {
            this.setDisabled(this.el_action, true);
        }
    }

    set total(total: number) {
        this.setText(this.el_total, formatNumber(total));
    }
}

export type TabState = {
    selected: string
};
export type TabActions = {
    onClick: (tab: string) => void
}

export class Tabs extends Component<TabState> {
    protected el_buttons: HTMLButtonElement[];

    constructor(container: HTMLElement, actions?: TabActions) {
        super(container);

        this.el_buttons = ensureAllElements<HTMLButtonElement>('.button', container);

        this.el_buttons.forEach(button => {
            button.addEventListener('click', () => {
                actions?.onClick?.(button.name);
            });
        })
    }

    set selected(name: string) {
        this.el_buttons.forEach(button => {
            this.toggleClass(button, 'tabs__item_active', button.name === name);
            this.setDisabled(button, button.name === name)
        });
    }
}