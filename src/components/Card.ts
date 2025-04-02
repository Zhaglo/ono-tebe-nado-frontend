import { bem, createElement, ensureElement, formatNumber } from "../utils/utils";
import { Component } from "./base/Component";
import { LotStatus } from "../types";

interface ICardActions {
    onClick: (event: MouseEvent) => void;
}

interface IAuctionActions {
    onSubmit: (price: number) => void;
}

export interface ICard<T> {
    image: string;
    title: string;
    description?: string | string[];
    status: T;
}

export class Card<T> extends Component<ICard<T>> {
    protected el_title: HTMLElement;
    protected el_image?: HTMLImageElement;
    protected el_description?: HTMLElement;
    protected el_button?: HTMLButtonElement;

    constructor(protected blockName: string, container: HTMLElement, actions?: ICardActions) {
        super(container);

        this.el_title = ensureElement<HTMLElement>(`.${blockName}__title`, container);
        this.el_image = ensureElement<HTMLImageElement>(`.${blockName}__image`, container);
        this.el_button = container.querySelector(`.${blockName}__button`);
        this.el_description = container.querySelector(`.${blockName}__description`);

        if (actions?.onClick) {
            if (this.el_button) {
                this.el_button.addEventListener('click', actions.onClick);
            } else {
                container.addEventListener('click', actions.onClick);
            }
        }
    }

    set id(value: string) {
        this.container.dataset.id = value;
    }

    get id(): string {
        return this.container.dataset.id || '';
    }

    set title(value: string) {
        this.setText(this.el_title, value);
    }

    get title(): string {
        return this.el_title.textContent || '';
    }

    set image(value: string) {
        this.setImage(this.el_image, value, this.title)
    }

    set description(value: string | string[]) {
        if (Array.isArray(value)) {
            this.el_description.replaceWith(...value.map(str => {
                const descTemplate = this.el_description.cloneNode() as HTMLElement;
                this.setText(descTemplate, str);
                return descTemplate;
            }));
        } else {
            this.setText(this.el_description, value);
        }
    }
}

export type CatalogElementStatus = {
    status: LotStatus,
    info: string
};

export class CatalogElement extends Card<CatalogElementStatus> {
    protected el_status: HTMLElement;

    constructor(container: HTMLElement, actions?: ICardActions) {
        super('card', container, actions);
        this.el_status = ensureElement<HTMLElement>(`.card__status`, container);
    }

    set status({ status, info }: CatalogElementStatus) {
        this.setText(this.el_status, info);
        this.toggleClass(this.el_status, bem(this.blockName, 'status', 'active').name, status === 'active');
        this.toggleClass(this.el_status, bem(this.blockName, 'status', 'closed').name, status === 'closed');
    }
}

export class PreviewElement extends Card<HTMLElement> {
    protected el_status: HTMLElement;

    constructor(container: HTMLElement, actions?: ICardActions) {
        super('lot', container, actions);
        this.el_status = ensureElement<HTMLElement>('.lot__status', container);
    }

    set status(content: HTMLElement) {
        this.el_status.replaceWith(content);
    }
}

export type AuctionStatus = {
    status: string,
    time: string,
    label: string,
    nextBid: number,
    history: number[]
};

export class Auction extends Component<AuctionStatus> {
    protected el_time: HTMLElement;
    protected el_label: HTMLElement;
    protected el_button: HTMLButtonElement;
    protected el_input: HTMLInputElement;
    protected el_history: HTMLElement;
    protected el_bids: HTMLElement
    protected el_form: HTMLFormElement;

    constructor(container: HTMLElement, actions?: IAuctionActions) {
        super(container);

        this.el_time = ensureElement<HTMLElement>(`.lot__auction-timer`, container);
        this.el_label = ensureElement<HTMLElement>(`.lot__auction-text`, container);
        this.el_button = ensureElement<HTMLButtonElement>(`.button`, container);
        this.el_input = ensureElement<HTMLInputElement>(`.form__input`, container);
        this.el_bids = ensureElement<HTMLElement>(`.lot__history-bids`, container);
        this.el_history = ensureElement<HTMLElement>('.lot__history', container);
        this.el_form = ensureElement<HTMLFormElement>(`.lot__bid`, container);

        this.el_form.addEventListener('submit', (event) => {
            event.preventDefault();
            const inputValue = parseInt(this.el_input.value);
            actions?.onSubmit?.(inputValue);
            return false;
        });
    }

    set time(value: string) {
        this.setText(this.el_time, value);
    }

    set label(value: string) {
        this.setText(this.el_label, value);
    }

    set nextBid(value: number) {
        this.el_input.value = String(value);
    }

    set history(value: number[]) {
        this.el_bids.replaceChildren(...value.map(item => createElement<HTMLUListElement>('li', {
            className: 'lot__history-item',
            textContent: formatNumber(item)
        })));
    }

    set status(value: LotStatus) {
        if (value !== 'active') {
            this.setHidden(this.el_history);
            this.setHidden(this.el_form);
        } else {
            this.setVisible(this.el_history);
            this.setVisible(this.el_form);
        }
    }

    focus() {
        this.el_input.focus();
    }
}

export interface BasketElementStatus {
    amount: number;
    status: boolean;
}

export class BasketElement extends Card<BasketElementStatus> {
    protected el_amount: HTMLElement;
    protected el_status: HTMLElement;
    protected el_selector: HTMLInputElement;

    constructor(container: HTMLElement, actions?: ICardActions) {
        super('bid', container, actions);
        this.el_amount = ensureElement<HTMLElement>('.bid__amount', container);
        this.el_status = ensureElement<HTMLElement>('.bid__status', container);
        this.el_selector = container.querySelector('.bid__selector-input');

        if (!this.el_button && this.el_selector) {
            this.el_selector.addEventListener('change', (event: MouseEvent) => {
                actions?.onClick?.(event);
            })
        }
    }

    set status({ amount, status }: BasketElementStatus) {
        this.setText(this.el_amount, formatNumber(amount));
        if (status) this.setVisible(this.el_status);
        else this.setHidden(this.el_status);
    }
}