import { Form } from "./common/Form";
import { IOrderForm } from "../types";
import { IEvents } from "./base/events";
import { ensureElement } from "../utils/utils";
import { Component } from "./base/Component";

export class Order extends Form<IOrderForm> {
    protected el_formErrors: HTMLElement;

    constructor(container: HTMLFormElement, events: IEvents) {
        super(container, events);

        this.el_formErrors = ensureElement<HTMLElement>('.form__errors', this.container);
    }

    setFormErrors(error: string) {
        this.el_formErrors.textContent = error;

        if (error) {
            this.el_formErrors.style.display = 'block';
        } else {
            this.el_formErrors.style.display = 'none';
        }
    }

    set phone(value: string) {
        (this.container.elements.namedItem('phone') as HTMLInputElement).value = value;
    }

    set email(value: string) {
        (this.container.elements.namedItem('email') as HTMLInputElement).value = value;
    }
}

interface ISuccess {}

interface ISuccessActions {
    onClick: () => void;
}

export class Success extends Component<ISuccess> {
    protected el_close: HTMLElement;

    constructor(container: HTMLElement, actions: ISuccessActions) {
        super(container);

        this.el_close = ensureElement<HTMLElement>('.state__action', this.container);

        if (actions?.onClick) {
            this.el_close.addEventListener('click', actions.onClick);
        }
    }
}