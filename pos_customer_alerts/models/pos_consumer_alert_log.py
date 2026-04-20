from odoo import models, fields, api
from datetime import date


class PosConsumerAlertLog(models.Model):
    """
    Registro persistente de alertas 'Consumidor Final' por empleado.
    Cada vez que un empleado valida una venta sin cliente asignado,
    se crea un registro aqui para seguimiento y eventuales llamados de atencion.
    """
    _name = "pos.consumer.alert.log"
    _description = "Registro de Alertas Consumidor Final POS"
    _order = "create_date desc"

    employee_id = fields.Many2one(
        "hr.employee",
        string="Empleado",
        required=True,
        index=True,
    )
    employee_name = fields.Char(
        string="Nombre Empleado",
        related="employee_id.name",
        store=True,
    )
    pos_config_id = fields.Many2one(
        "pos.config",
        string="Punto de Venta",
    )
    pos_config_name = fields.Char(
        string="Sucursal",
        related="pos_config_id.name",
        store=True,
    )
    pos_order_id = fields.Many2one(
        "pos.order",
        string="Orden POS",
    )
    order_ref = fields.Char(
        string="Referencia Orden",
    )
    order_amount = fields.Float(
        string="Monto de la Venta",
    )
    alert_date = fields.Date(
        string="Fecha",
        default=fields.Date.today,
        index=True,
    )
    alert_datetime = fields.Datetime(
        string="Fecha y Hora",
        default=fields.Datetime.now,
    )
    month_count = fields.Integer(
        string="Acumulado del Mes",
        help="Cantidad de ventas a Consumidor Final de este empleado en el mes",
    )
    acknowledged = fields.Boolean(
        string="Visto por Empleado",
        default=True,
        help="El empleado vio el popup de alerta",
    )
    notes = fields.Text(
        string="Notas",
    )

    @api.model
    def get_employee_month_count(self, employee_id):
        """Obtener cantidad de alertas del empleado en el mes actual."""
        today = date.today()
        first_day = today.replace(day=1)
        count = self.search_count([
            ("employee_id", "=", employee_id),
            ("alert_date", ">=", first_day),
            ("alert_date", "<=", today),
        ])
        return count

    @api.model
    def log_consumer_final_alert(self, vals):
        """
        Registrar una nueva alerta de consumidor final.
        Llamado desde el POS via controller.
        vals: {employee_id, pos_config_id, order_ref, order_amount}
        """
        employee_id = vals.get("employee_id")
        if not employee_id:
            return {"count": 0}

        # Contar las existentes del mes ANTES de crear la nueva
        month_count = self.get_employee_month_count(employee_id) + 1

        # Crear el registro
        self.create({
            "employee_id": employee_id,
            "pos_config_id": vals.get("pos_config_id"),
            "order_ref": vals.get("order_ref"),
            "order_amount": vals.get("order_amount", 0),
            "month_count": month_count,
        })

        return {"count": month_count}
