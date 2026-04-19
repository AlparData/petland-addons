/** @odoo-module */

import { Component, useState, useRef, onMounted } from "@odoo/owl";

// ============================================================
// POPUP 1: DATOS FALTANTES (Email / Telefono)
// Amarillo con rojo - Con campos para completar
// ============================================================
export class MissingDataPopup extends Component {
    static template = "pos_customer_alerts.MissingDataPopup";
    static props = {
        cashierName: { type: String },
        customerName: { type: String },
        missingEmail: { type: Boolean },
        missingPhone: { type: Boolean },
        currentEmail: { type: String, optional: true },
        currentPhone: { type: String, optional: true },
        close: { type: Function },
    };

    setup() {
        this.state = useState({
            email: this.props.currentEmail || "",
            phone: this.props.currentPhone || "",
        });
        this.emailInput = useRef("emailInput");
        this.phoneInput = useRef("phoneInput");

        onMounted(() => {
            if (this.props.missingEmail && this.emailInput.el) {
                this.emailInput.el.focus();
            } else if (this.props.missingPhone && this.phoneInput.el) {
                this.phoneInput.el.focus();
            }
        });
    }

    onKeydown(ev) {
        if (ev.key === "Escape") {
            this.onSkip();
        }
    }

    onInputKeydown(ev) {
        if (ev.key === "Enter") {
            this.onSave();
        }
    }

    async onSave() {
        const data = {};
        if (this.props.missingEmail && this.state.email.trim()) {
            data.email = this.state.email.trim();
        }
        if (this.props.missingPhone && this.state.phone.trim()) {
            data.phone = this.state.phone.trim();
        }
        this.props.close({ confirmed: true, payload: data });
    }

    onSkip() {
        this.props.close({ confirmed: false, payload: {} });
    }
}


// ============================================================
// POPUP 2: DESCUENTO MEDICACION
// Verde informativo - Solo boton OK
// ============================================================
export class DiscountAlertPopup extends Component {
    static template = "pos_customer_alerts.DiscountAlertPopup";
    static props = {
        cashierName: { type: String },
        customerName: { type: String },
        close: { type: Function },
    };

    onKeydown(ev) {
        if (ev.key === "Escape" || ev.key === "Enter") {
            this.onConfirm();
        }
    }

    onConfirm() {
        this.props.close({ confirmed: true });
    }
}


// ============================================================
// POPUP 3: CONSUMIDOR FINAL
// Rojo total - Contador mensual - Queda registrado
// ============================================================
export class ConsumerFinalPopup extends Component {
    static template = "pos_customer_alerts.ConsumerFinalPopup";
    static props = {
        cashierName: { type: String },
        monthCount: { type: Number },
        close: { type: Function },
    };

    onKeydown(ev) {
        if (ev.key === "Escape" || ev.key === "Enter") {
            this.onClose();
        }
    }

    onClose() {
        this.props.close({ confirmed: true });
    }
}


// ============================================================
// POPUP 4: PEDIDOS WEB PENDIENTES (Solo Suc Coto)
// Azul/Naranja - Lista de pedidos - Cada 5 minutos
// ============================================================
export class PendingWebOrdersPopup extends Component {
    static template = "pos_customer_alerts.PendingWebOrdersPopup";
    static props = {
        cashierName: { type: String },
        orderCount: { type: Number },
        orders: { type: Array },
        close: { type: Function },
    };

    onKeydown(ev) {
        if (ev.key === "Escape" || ev.key === "Enter") {
            this.onClose();
        }
    }

    onClose() {
        this.props.close({ confirmed: true });
    }
}