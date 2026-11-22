"""operaciones fase 4: salidas sin columnas de bloques obligatorias, horarios de jornada

Revision ID: i4e0a6d27f38
Revises: h3d9f5c16e27
Create Date: 2026-11-22 22:00:00.000000

* salidas.tarifa_valor_bloque y salidas.bloques dejan de ser obligatorias: el flujo nuevo
  (POST /operaciones/registrar) guarda tarifa_version_id + detalle_cobro, y una salida de un
  cliente mensual no tiene tarifa por hora.
* Se siembran los horarios de las jornadas de mensualidad (mañana / tarde) en `configuracion`.
  Defaults propuestos (el admin los cambia en PUT /tarifas/configuracion):
  mañana 06:00-14:00, tarde 14:00-22:00; "completa" no tiene restricción.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'i4e0a6d27f38'
down_revision: Union[str, None] = 'h3d9f5c16e27'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('salidas', 'tarifa_valor_bloque', existing_type=sa.Numeric(12, 2), nullable=True)
    op.alter_column('salidas', 'bloques', existing_type=sa.Integer(), nullable=True)
    op.execute(
        """
        INSERT INTO configuracion (clave, valor, descripcion) VALUES
          ('jornada_manana_inicio', '"06:00"', 'Inicio de la jornada de mañana de las mensualidades (hora de Colombia, formato 24 h)'),
          ('jornada_manana_fin', '"14:00"', 'Fin de la jornada de mañana'),
          ('jornada_tarde_inicio', '"14:00"', 'Inicio de la jornada de tarde'),
          ('jornada_tarde_fin', '"22:00"', 'Fin de la jornada de tarde')
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM configuracion WHERE clave LIKE 'jornada_%'")
    # Falla si ya hay salidas del flujo nuevo (NULL en estas columnas).
    op.alter_column('salidas', 'bloques', existing_type=sa.Integer(), nullable=False)
    op.alter_column('salidas', 'tarifa_valor_bloque', existing_type=sa.Numeric(12, 2), nullable=False)
