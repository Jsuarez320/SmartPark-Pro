"""recibos fase 6: auditoría de reimpresiones e inmutabilidad de los recibos

Revision ID: j5f1b7e38a49
Revises: i4e0a6d27f38
Create Date: 2026-11-22 23:30:00.000000

* recibo_reimpresiones: quién reimprimió cada recibo y cuándo (el contador recibos.reimpresiones
  sigue siendo el total; esta tabla es el rastro de auditoría).
* Un recibo guardado no se puede modificar ni borrar, salvo su contador de reimpresiones: así la
  reimpresión es idéntica al original. Lo garantiza un trigger en la BD, no solo el código.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'j5f1b7e38a49'
down_revision: Union[str, None] = 'i4e0a6d27f38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTA: no usar el caracter de porcentaje en este SQL (se envia directo al driver).
_FUNCION = r"""
CREATE OR REPLACE FUNCTION fn_recibos_inmutables()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION USING MESSAGE = 'Los recibos no se pueden eliminar';
    END IF;

    IF NEW.id <> OLD.id
       OR NEW.numero <> OLD.numero
       OR NEW.tipo <> OLD.tipo
       OR NEW.contenido <> OLD.contenido
       OR NEW.operador_id <> OLD.operador_id
       OR NEW.created_at <> OLD.created_at
       OR NEW.placa IS DISTINCT FROM OLD.placa
       OR NEW.ingreso_id IS DISTINCT FROM OLD.ingreso_id
       OR NEW.salida_id IS DISTINCT FROM OLD.salida_id
       OR NEW.membresia_id IS DISTINCT FROM OLD.membresia_id
       OR NEW.turno_id IS DISTINCT FROM OLD.turno_id THEN
        RAISE EXCEPTION USING MESSAGE = 'El contenido de un recibo no se puede modificar';
    END IF;
    RETURN NEW;
END;
$$;
"""


def upgrade() -> None:
    op.create_table(
        'recibo_reimpresiones',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('recibo_id', sa.UUID(), nullable=False),
        sa.Column('usuario_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recibo_id'], ['recibos.id']),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_recibo_reimpresiones_recibo', 'recibo_reimpresiones', ['recibo_id'])

    op.execute(_FUNCION)
    op.execute(
        "CREATE TRIGGER trg_recibos_inmutables BEFORE UPDATE OR DELETE ON recibos "
        "FOR EACH ROW EXECUTE FUNCTION fn_recibos_inmutables()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_recibos_inmutables ON recibos")
    op.execute("DROP FUNCTION IF EXISTS fn_recibos_inmutables()")
    op.drop_index('idx_recibo_reimpresiones_recibo', table_name='recibo_reimpresiones')
    op.drop_table('recibo_reimpresiones')
