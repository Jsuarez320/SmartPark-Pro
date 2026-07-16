from fastapi import Depends, HTTPException, status

from app.services.auth import get_current_user


async def require_admin(current_user=Depends(get_current_user)):
    if not current_user.es_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador",
        )
    return current_user


async def require_employee(current_user=Depends(get_current_user)):
    return current_user
