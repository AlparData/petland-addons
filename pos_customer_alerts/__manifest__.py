{
    'name': 'POS Customer Alerts - Pet Land',
    'version': '19.0.3.0.0',
    'category': 'Point of Sale',
    'summary': 'Alertas POS: datos faltantes, descuento MED, consumidor final con registro, pedidos web Coto',
    'description': """
        Modulo para Pet Land - 4 alertas en POS:

        1. POPUP AMARILLO/ROJO: Cliente sin email o telefono → campos para cargar.
        2. POPUP VERDE: Cliente con Promo MED 20% → informativo.
        3. POPUP ROJO: Venta como Consumidor Final → contador mensual + registro BD.
        4. POPUP AZUL/NARANJA: Pedidos web pendientes (solo Suc Coto, cada 5 min).

        Todos muestran nombre del cajero. Registro para seguimiento de empleados.
    """,
    'author': 'Pet Land - Gabriel Godoy',
    'depends': ['point_of_sale', 'hr', 'sale', 'website_sale'],
    'data': [
        'security/ir.model.access.csv',
        'views/pos_consumer_alert_log_views.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_customer_alerts/static/src/css/alerts.css',
            'pos_customer_alerts/static/src/js/customer_alert_popup.js',
            'pos_customer_alerts/static/src/js/customer_alert_service.js',
            'pos_customer_alerts/static/src/xml/customer_alert_popup.xml',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}