import './scss/styles.scss';

import {AuctionAPI} from "./components/AuctionAPI";
import {API_URL, CDN_URL} from "./utils/constants";
import {EventEmitter} from "./components/base/events";
import { cloneTemplate, createElement, ensureElement } from "./utils/utils";
import { AppData, CatalogChanged, LotElement } from './components/AppData';
import { Page } from './components/Page';
import { Auction, BasketElement, CatalogElement, PreviewElement } from './components/Card';
import { Modal } from './components/common/Modal';
import { Basket, Tabs } from './components/Basket';
import { Order, Success } from './components/Order';
import { IOrderForm } from './types';

const events = new EventEmitter();
const api = new AuctionAPI(CDN_URL, API_URL);

// Чтобы мониторить все события, для отладки
events.onAll(({ eventName, data }) => {
    console.log(eventName, data);
})

// Все шаблоны
const CatalogElementTemplate = ensureElement<HTMLTemplateElement>('#card');
const PreviewElementTemplate = ensureElement<HTMLTemplateElement>('#preview');
const AuctionTemplate = ensureElement<HTMLTemplateElement>('#auction');

const ClosedLotsTemplate = ensureElement<HTMLTemplateElement>('#basket');
const ActiveLotsTemplate = ensureElement<HTMLTemplateElement>('#bids');

const ClosedElementTemplate = ensureElement<HTMLTemplateElement>('#sold');
const ActiveElementTemplate = ensureElement<HTMLTemplateElement>('#bid');

const TabsTemplate = ensureElement<HTMLTemplateElement>('#tabs');

const OrderTemplate = ensureElement<HTMLTemplateElement>('#order');

const SuccessTemplate = ensureElement<HTMLTemplateElement>('#success');

// Модель данных приложения
const appData = new AppData({}, events);


// Глобальные контейнеры
const page = new Page(document.body, events);
const modalContainer = ensureElement<HTMLElement>('#modal-container');

// Переиспользуемые части интерфейса
const modal = new Modal(modalContainer, events);
const closedLots = new Basket(cloneTemplate(ClosedLotsTemplate), events);
const activeLots = new Basket(cloneTemplate(ActiveLotsTemplate), events);
const order = new Order(cloneTemplate(OrderTemplate), events);

const tabs = new Tabs(cloneTemplate(TabsTemplate), {
    onClick: (name) => {
        if (name === 'closed') events.emit('closed-lots:open');
        else events.emit('active-lots:open');
    }
});

// Дальше идет бизнес-логика
// Поймали событие, сделали что нужно


// Получаем лоты с сервера
api.getLotList()
    .then(result => {
        appData.setCatalog(result);
    })
    .catch(err => {
        console.error(err);
    });


events.on<CatalogChanged>('catalog:changed', () => {
    console.log(appData.catalog);
    page.catalog = appData.catalog.map(lot => {
        const card = new CatalogElement(cloneTemplate(CatalogElementTemplate), {
            onClick: () => events.emit('card:select', lot)
        });
        return card.render({
            title: lot.title,
            image: lot.image,
            description: lot.about,
            status: {
                status: lot.status,
                info: lot.statusInfo
            },
        });
    });
});

events.on('card:select', (lot: LotElement) => {
    appData.setPreview(lot);
});

events.on('preview:changed', (lot: LotElement) => {
    const showItem = (lot: LotElement) => {
        const card = new PreviewElement(cloneTemplate(PreviewElementTemplate));
        const auction = new Auction(cloneTemplate(AuctionTemplate), {
            onSubmit: (price) => {
                lot.placeBid(price);
                auction.render({
                    status: lot.status,
                    time: lot.timeStatus,
                    label: lot.auctionStatus,
                    nextBid: lot.nextBid,
                    history: lot.history
                });
            }
        });

        modal.render({
            content: card.render({
                title: lot.title,
                image: lot.image,
                description: lot.description.split("\n"),
                status: auction.render({
                    status: lot.status,
                    time: lot.timeStatus,
                    label: lot.auctionStatus,
                    nextBid: lot.nextBid,
                    history: lot.history
                })
            })
        });

        if (lot.status === 'active') {
            auction.focus();
        }
    };

    if (lot) {
        api.getLotItem(lot.id)
            .then((result) => {
                lot.description = result.description;
                // заглушка потому что данные на сервере не обрабатываются
                if (!lot.history) {
                    lot.history = result.history;
                }
                showItem(lot);
            })
            .catch((err) => {
                console.error(err);
            })
    } else {
        modal.close();
    }
});

events.on('auction:changed', () => {
    page.counter = appData.getClosedLots().length;
    activeLots.items = appData.getActiveLots().map(
        lot => {
            const card = new BasketElement(cloneTemplate(ActiveElementTemplate), {
                onClick: () => events.emit('preview:changed', lot)
            });
            return card.render({
                title: lot.title,
                image: lot.image,
                status: {
                    amount: lot.price,
                    status: lot.isAuctionWinner
                }
            });
        }
    );

    closedLots.items = appData.getClosedLots().map(
        lot => {
            const card = new BasketElement(cloneTemplate(ClosedElementTemplate), {
                onClick: (event) => {
                    const checkbox = event.target as HTMLInputElement;
                    appData.toggleOrderedLot(lot.id, checkbox.checked);
                    closedLots.total = appData.getTotalPrice();
                    closedLots.selected = appData.order.items;
                }
            });
            return card.render({
                title: lot.title,
                image: lot.image,
                status: {
                    amount: lot.price,
                    status: lot.isAuctionWinner
                }
            });
        }
    );
});


events.on('active-lots:open', () => {
    modal.render({
        content: createElement<HTMLElement>('div', {}, [
            tabs.render({
                selected: 'active'
            }),
            activeLots.render()
        ])
    });
});

events.on('closed-lots:open', () => {
    modal.render({
        content: createElement<HTMLElement>('div', {}, [
            tabs.render({
                selected: 'closed'
            }),
            closedLots.render()
        ])
    });
});

events.on('order:open', () => {
    modal.render({
        content: order.render({
            phone: '',
            email: '',
            valid: false,
            errors: ''
        })
    });
});

events.on(/^order\..*:change/, (data: { field: keyof IOrderForm, value: string }) => {
    const valid = appData.setOrderField(data.field, data.value);
    order.valid = valid;
    if (valid) {
        order.setFormErrors("");
    }
});

events.on(/^order\..*:error/, ( errors: string[] ) => {
    if (errors.includes("no-field")) {
        order.setFormErrors("Поля какие-то пустые...");
    }
    else if (errors.includes("email")) {
        order.setFormErrors("email какой-то не такой...");
    }
    else if (errors.includes("phone")) {
        order.setFormErrors("телефон какой-то не такой...");
    }
});

events.on('order:submit', () => {
    api.orderLots(appData.order)
        .then((result) => {
            const success = new Success(cloneTemplate(SuccessTemplate), {
                onClick: () => {
                    modal.close();
                    appData.clearBasket();
                    events.emit('auction:changed');
                }
            });
            modal.render({
                content: success.render({})
            });
        })
        .catch(err => {
            console.log(err);
        });
});

events.on('modal:open', () => {
    page.locked = true;
});

events.on('modal:close', () => {
    page.locked = false;
});