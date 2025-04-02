import _ from "lodash";
import {dayjs, formatNumber} from "../utils/utils";

import { Model } from "./base/Model";
import { IEvents } from "./base/events";

import { ILot, LotStatus, IOrder, IOrderResult, IBid, FormErrors, IOrderForm, IAppData } from "../types";
import { AuctionAPI } from "./AuctionAPI";
import {API_URL, CDN_URL} from "../utils/constants";

export type CatalogChanged = {
    catalog: LotElement[];
    preview: ILot | null;
}

export class LotElement extends Model<ILot> {
    //ILotItem
    id: string;
    title: string;
    about: string;
    description: string;
    image: string;
    
    //IAuction
    status: LotStatus;
    datetime: string;
    price: number;
    minPrice: number;
    history: number[];

    private userLastBid: number = 0;

    clearUserLastBid() {
        this.userLastBid = 0;
    }

    get statusInfo(): string {
        switch (this.status) {
            case "active":
                return `Открыто до ${dayjs(this.datetime).format('D MMMM [в] HH:mm')}`
            case "closed":
                return `Закрыто ${dayjs(this.datetime).format('D MMMM [в] HH:mm')}`
            case "wait":
                return `Откроется ${dayjs(this.datetime).format('D MMMM [в] HH:mm')}`
            default:
                return this.status;
        }
    }

    get nextBid(): number {
        return Math.floor(this.price * 1.1);
    }

    placeBid(price: number): void {
        if (price <= this.price || !Number(price)) {
            console.log('Ставка должна быть больше предыдущей');
            return;
        }

        this.price = price;
        this.history.shift();
        this.history.push(price);
        this.userLastBid = price;

        // ну я пытался но оно не работает
        const api = new AuctionAPI(CDN_URL, API_URL);
        api.placeBid(this.id, {price: this.userLastBid});


        if (price > (this.minPrice * 10)) {
            this.status = 'closed';
        }
        this.emitChanges('auction:changed', { id: this.id, price });
    }

    get timeStatus(): string {
        if (this.status === 'closed') return 'Аукцион завершен';
        else return dayjs
            .duration(dayjs(this.datetime).valueOf() - Date.now())
            .format('D[д] H[ч] m[ мин] s[ сек]');
    }

    get auctionStatus(): string {
        switch (this.status) {
            case 'closed':
                return `Продано за ${formatNumber(this.price)}₽`;
            case 'wait':
                return 'До начала аукциона';
            case 'active':
                return 'До закрытия лота';
            default:
                return '';
        }
    }

    get isAuctionWinner(): boolean {
        return this.userLastBid === this.price;
    }

    get isUserInAuction(): boolean {
        return this.userLastBid !== 0;
    }
}

export class AppData extends Model<IAppData> {
    catalog: LotElement[];
    basket: LotElement[];
    preview: ILot | null;
    order: IOrder = {
        email: '',
        phone: '',
        items: []
    };

    setCatalog(elements: ILot[]) {
        this.catalog = elements.map(
            elements => new LotElement(elements, this.events)
        );
        this.emitChanges('catalog:changed', { catalog: this.catalog });
    }

    setPreview(lot: ILot) {
        this.preview = lot;
        this.emitChanges('preview:changed', lot);
    }

    getActiveLots(): LotElement[] {
        return this.catalog.filter(lot => lot.status === 'active' && lot.isUserInAuction);
    }

    getClosedLots(): LotElement[] {
        return this.catalog.filter(lot => lot.status === 'closed' && lot.isAuctionWinner)
    }

    getTotalPrice(): number {
        let totalPrice = 0;
        this.order.items.map(lotId => {
            const item = this.catalog.find(element => element.id === lotId);
            if (item) {
                totalPrice += item.price;
            }
        });
        return totalPrice;
    }

    toggleOrderedLot(id: string, isIncluded: boolean) {
        if (isIncluded) {
            this.order.items = _.uniq([...this.order.items, id]);
        } else {
            this.order.items = _.without(this.order.items, id);
        }
    }

    setOrderField(field: keyof IOrderForm, value: string): boolean {
        this.order[field] = value.trim();

        const errors: string[] = this.validate();
        errors.forEach(error => {
            this.events.emit(`order.${error}:error`, errors);
        });
        return errors.length === 0;
    }

    validate(): string[] {
        const phone = this.order.phone;
        const email = this.order.email;
        const errors: string[] = [];

        const phoneRegex = /^(8|\+7)[\s]?\(?\d{3}\)?[\s]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/;
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!email || !phone) {
            errors.push('no-field');
        }
        if (!phoneRegex.test(phone)) {
            errors.push('phone');
        }
        if (!emailRegex.test(email)) {
            errors.push('email');
        }
        return errors;
    }

    clearBasket(): void {
        this.order.items.forEach(id => {
            this.toggleOrderedLot(id, false);
            const element = this.catalog.find(lot => lot.id === id);
            element.clearUserLastBid();
        });
    }
}