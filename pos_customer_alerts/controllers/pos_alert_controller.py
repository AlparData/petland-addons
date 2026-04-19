from odoo import http
from odoo.http import request
import json


class PosAlertController(http.Controller):

    @http.route(
        "/pos_customer_alerts/log_consumer_final",
        type="json",
        auth="user",
        methods=["POST"],
    )
    def log_consumer_final(self, **kwargs):
        """
        Endpoint llamado desde el POS cuando una venta sale como Consumidor Final.
        Registra la alerta y devuelve el conteo mensual del empleado.
        """
        vals = kwargs if kwargs else json.loads(request.httprequest.data or "{}")
        result = request.env["pos.consumer.alert.log"].sudo().log_consumer_final_alert(vals)
        return result

    @http.route(
        "/pos_customer_alerts/get_month_count",
        type="json",
        auth="user",
        methods=["POST"],
    )
    def get_month_count(self, employee_id=None, **kwargs):
        """
        Obtener el conteo mensual de un empleado.
        """
        if not employee_id:
            return {"count": 0}
        count = request.env["pos.consumer.alert.log"].sudo().get_employee_month_count(employee_id)
        return {"count": count}

    @http.route(
        "/pos_customer_alerts/pending_web_orders",
        type="json",
        auth="user",
        methods=["POST"],
    )
    def get_pending_web_orders(self, **kwargs):
        """
        Devuelve pedidos web pendientes de entrega.
        Usado por Suc Coto para mostrar popup cada 5 minutos.
        """
        orders = request.env["sale.order"].sudo().search_read(
            [
                ("website_id", "!=", False),
                ("state", "=", "sale"),
                ("delivery_status", "in", ["pending", "partial"]),
            ],
            fields=["name", "partner_id", "amount_total", "date_order"],
            order="date_order desc",
            limit=20,
        )
        result = []
        for o in orders:
            result.append({
                "id": o["id"],
                "name": o["name"],
                "customer": o["partner_id"][1] if o["partner_id"] else "Sin cliente",
                "amount": o["amount_total"],
                "date": str(o["date_order"]),
            })
        return {"orders": result, "count": len(result)}