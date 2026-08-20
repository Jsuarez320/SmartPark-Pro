"""fix es_admin default to false

Revision ID: 279a423f71ce
Revises: 
Create Date: 2026-08-19 20:50:43.792994

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '279a423f71ce'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'usuarios',
        'es_admin',
        server_default=sa.text('false'),
    )


def downgrade() -> None:
    op.alter_column(
        'usuarios',
        'es_admin',
        server_default=sa.text('true'),
    )
