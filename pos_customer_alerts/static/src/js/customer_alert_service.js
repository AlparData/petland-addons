/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/services/pos_store";
import { MissingDataPopup } from "./customer_alert_popup";
import { DiscountAlertPopup } from "./customer_alert_popup";
import { ConsumerFinalPopup } from "./customer_alert_popup";
import { PendingWebOrdersPopup } from "./customer_alert_popup";
import { rpc } from "@web/core/network/rpc";

// IDs de partners "Consumidor Final" en Pet Land
const CONSUMER_FINAL_IDS = [6, 126858];

// ID de la lista de precios "Promo MED 20%"
const PROMO_MED_PRICELIST_ID = 12;

// ID de POS Config "Suc Coto" - unico POS que recibe alerta de pedidos web
const POS_COTO_ID = 7;

// Intervalo de polling: 5 minutos (en milisegundos)
const WEB_ORDERS_POLL_INTERVAL = 5 * 60 * 1000;

/**
 * Helper: chequea si un campo esta vacio o es placeholder
 */
function isEmpty(value) {
    if (!value) return true;
    const trimmed = String(value).trim();
    return trimmed === "" || trimmed === "-" || trimmed === "false" || trimmed === "0";
}

/**
 * Obtener nombre del cajero actual del POS
 * En Odoo 17+ el cashier es this.cashier (no this.get_cashier())
 */
function getCashierName(posStore) {
    const cashier = posStore.cashier || posStore.get_cashier?.();
    if (cashier) {
        return cashier.name || cashier.display_name || "Cajero";
    }
    return "Cajero";
}

/**
 * Obtener ID del empleado (hr.employee) del cajero
 */
function getCashierEmployeeId(posStore) {
    const cashier = posStore.cashier || posStore.get_cashier?.();
    if (cashier) {
        return cashier.id;
    }
    return null;
}

/**
 * Chequea si el partner es Consumidor Final
 * Si no hay partner tambien se considera Consumidor Final
 */
function isConsumerFinal(partner) {
    if (!partner) return true;
    console.log("[POS Alerts] isConsumerFinal check - partner.id:", partner.id, "| name:", partner.name);
    return CONSUMER_FINAL_IDS.includes(partner.id);
}


// ============================================================
// PATCH: POS Store con las 4 alertas
// ============================================================
patch(PosStore.prototype, {

    /**
     * Override de setup para iniciar polling de pedidos web en Coto
     */
    async setup(...args) {
        await super.setup(...args);
        this._webOrdersPollTimer = null;
        this._webOrdersPopupShowing = false;
    },

    async after_start_screen() {
        await super.after_start_screen?.(...arguments);
        // Iniciar polling solo si es Suc Coto
        this._startWebOrdersPolling();
    },

    /**
     * Inicia polling cada 5 min si estamos en Suc Coto
     */
    _startWebOrdersPolling() {
        const configId = this.config?.id;
        if (configId !== POS_COTO_ID) {
            return; // No es Coto, no hacer nada
        }

        console.log("[POS Alerts] Suc Coto detectada - iniciando polling pedidos web cada 5 min");

        // Chequear inmediatamente al abrir
        this._checkPendingWebOrders();

        // Luego cada 5 minutos
        this._webOrdersPollTimer = setInterval(() => {
            this._checkPendingWebOrders();
        }, WEB_ORDERS_POLL_INTERVAL);
    },

    /**
     * Consulta pedidos web pendientes y muestra popup si hay
     */
    async _checkPendingWebOrders() {
        if (this._webOrdersPopupShowing) return; // Ya hay un popup abierto

        try {
            const result = await rpc("/pos_customer_alerts/pending_web_orders", {});
            const orders = result?.orders || [];
            const count = result?.count || 0;

            if (count > 0) {
                this._webOrdersPopupShowing = true;
                const cashierName = getCashierName(this);

                await this.env.services.dialog.add(
                    PendingWebOrdersPopup,
                    {
                        cashierName: cashierName,
                        orderCount: count,
                        orders: orders,
                    }
                );
                this._webOrdersPopupShowing = false;
            }
        } catch (error) {
            console.error("[POS Alerts] Error consultando pedidos web:", error);
            this._webOrdersPopupShowing = false;
        }
    },

    /**
     * Limpiar timer al cerrar POS
     */
    async closePos() {
        if (this._webOrdersPollTimer) {
            clearInterval(this._webOrdersPollTimer);
            this._webOrdersPollTimer = null;
        }
        return await super.closePos?.(...arguments);
    },

    // ============================================================
    // POPUP 1 y 2: Al seleccionar cliente
    // ============================================================
    async selectPartner(...args) {
        const result = await super.selectPartner(...args);

        const order = this.currentOrder;
        if (!order) return result;

        // En Odoo 17+ el partner es una propiedad reactiva, no un metodo
        const partner = order.partner ?? order.get_partner?.();
        if (!partner) return result;

        if (isConsumerFinal(partner)) return result;

        const cashierName = getCashierName(this);

        // --- POPUP 1: Datos faltantes (email y/o telefono) ---
        const missingEmail = isEmpty(partner.email);
        const missingPhone = isEmpty(partner.phone);

        if (missingEmail || missingPhone) {
            const { confirmed, payload } = await this.env.services.dialog.add(
                MissingDataPopup,
                {
                    cashierName: cashierName,
                    customerName: partner.name || "Sin nombre",
                    missingEmail: missingEmail,
                    missingPhone: missingPhone,
                    currentEmail: partner.email || "",
                    currentPhone: partner.phone || "",
                }
            );

            if (confirmed && payload) {
                const updates = {};
                if (payload.email) updates.email = payload.email;
                if (payload.phone) updates.phone = payload.phone;

                if (Object.keys(updates).length > 0) {
                    try {
                        await this.data.write("res.partner", [partner.id], updates);
                        if (payload.email) partner.email = payload.email;
                        if (payload.phone) partner.phone = payload.phone;
                    } catch (error) {
                        console.error("[POS Alerts] Error guardando datos del cliente:", error);
                    }
                }
            }
        }

        // --- POPUP 2: Descuento medicacion ---
        const pricelistId = partner.property_product_pricelist;
        const plId = Array.isArray(pricelistId) ? pricelistId[0] : pricelistId;

        if (plId === PROMO_MED_PRICELIST_ID) {
            await this.env.services.dialog.add(
                DiscountAlertPopup,
                {
                    cashierName: cashierName,
                    customerName: partner.name || "Sin nombre",
                }
            );
        }

        return result;
    },

    // ============================================================
    // POPUP 3: Al validar venta como Consumidor Final
    // En Odoo 17+ se usa validateOrder en lugar de push_single_order
    // ============================================================
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        // En Odoo 17+ el partner es una propiedad reactiva
        const partner = order?.partner ?? order?.get_partner?.();

        console.log("[POS Alerts] validateOrder - partner.id:", partner?.id, "| name:", partner?.name);

        const result = await super.validateOrder(isForceValidate);

        try {
            if (isConsumerFinal(partner)) {
                console.log("[POS Alerts] Consumidor Final detectado! Registrando alerta...");

                const cashierName = getCashierName(this);
                const employeeId = getCashierEmployeeId(this);
                const posConfigId = this.config?.id || null;
                const orderRef = order.name || order.uid || "";
                // Compatibilidad Odoo 17/18/19
                const orderAmount = order.getTotalWithTax?.() ?? order.get_total_with_tax?.() ?? 0;

                let monthCount = 1;
                try {
                    const response = await rpc(
                        "/pos_customer_alerts/log_consumer_final",
                        {
                            employee_id: employeeId,
                            pos_config_id: posConfigId,
                            order_ref: orderRef,
                            order_amount: orderAmount,
                        }
                    );
                    monthCount = response?.count || 1;
                    console.log("[POS Alerts] Registro guardado. Count mensual:", monthCount);
                } catch (rpcError) {
                    console.error("[POS Alerts] Error registrando alerta consumidor final:", rpcError);
                }

                await this.env.services.dialog.add(
                    ConsumerFinalPopup,
                    {
                        cashierName: cashierName,
                        monthCount: monthCount,
                    }
                );
            }
        } catch (error) {
            console.error("[POS Alerts] Error en alerta consumidor final:", error);
        }

        return result;
    },
});