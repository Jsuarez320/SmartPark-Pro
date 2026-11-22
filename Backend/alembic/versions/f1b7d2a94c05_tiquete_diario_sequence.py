"""secuencia de tiquetes para clientes diarios (sin tarjeta)

Revision ID: f1b7d2a94c05
Revises: e5a9c3b81f27
Create Date: 2026-11-22 10:00:00.000000

Los clientes mensuales ingresan con tarjeta fisica; los diarios reciben un recibo
impreso. El numero del recibo se guarda en ingresos.tarjeta_codigo (formato D-000123),
asi la busqueda en patio y la salida funcionan igual para ambos.
"""
from typing import Sequence, Union

from alembic import op

revision: str = 'f1b7d2a94c05'
down_revision: Union[str, None] = 'e5a9c3b81f27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS seq_tiquete_diario START 1")


def downgrade() -> None:
    op.execute("DROP SEQUENCE IF EXISTS seq_tiquete_diario")
