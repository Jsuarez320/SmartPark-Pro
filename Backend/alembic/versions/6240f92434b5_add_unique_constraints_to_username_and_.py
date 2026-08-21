"""add unique constraints to username and email

Revision ID: 6240f92434b5
Revises: 279a423f71ce
Create Date: 2026-08-19 22:18:59.899501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '6240f92434b5'
down_revision: Union[str, None] = '279a423f71ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(
        'uq_usuarios_username',
        'usuarios',
        ['username'],
    )
    op.create_unique_constraint(
        'uq_usuarios_email',
        'usuarios',
        ['email'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_usuarios_email', 'usuarios', type_='unique')
    op.drop_constraint('uq_usuarios_username', 'usuarios', type_='unique')
