"""CSV parsers router: CRUD endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, verify_csrf
from app.models.csv_parser import CsvParser
from app.models.user import User
from app.schemas.csv_parser import CsvParserCreate, CsvParserResponse, CsvParserUpdate

router = APIRouter(prefix="/api/csv-parsers", tags=["csv-parsers"])


@router.get("", response_model=list[CsvParserResponse])
async def list_csv_parsers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[CsvParser]:
    """List all CSV parsers for the authenticated user."""
    result = await db.execute(
        select(CsvParser)
        .where(CsvParser.user_id == user.id)
        .order_by(CsvParser.name)
    )
    return list(result.scalars().all())


@router.post(
    "",
    response_model=CsvParserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_csrf)],
)
async def create_csv_parser(
    body: CsvParserCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CsvParser:
    """Create a new CSV parser."""
    parser = CsvParser(user_id=user.id, **body.model_dump())
    db.add(parser)
    await db.commit()
    await db.refresh(parser)
    return parser


@router.get("/{parser_id}", response_model=CsvParserResponse)
async def get_csv_parser(
    parser_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CsvParser:
    """Get a single CSV parser by ID."""
    result = await db.execute(
        select(CsvParser).where(
            CsvParser.id == parser_id, CsvParser.user_id == user.id
        )
    )
    parser = result.scalar_one_or_none()
    if parser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CSV parser not found"
        )
    return parser


@router.put(
    "/{parser_id}",
    response_model=CsvParserResponse,
    dependencies=[Depends(verify_csrf)],
)
async def update_csv_parser(
    parser_id: uuid.UUID,
    body: CsvParserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CsvParser:
    """Update a CSV parser."""
    result = await db.execute(
        select(CsvParser).where(
            CsvParser.id == parser_id, CsvParser.user_id == user.id
        )
    )
    parser = result.scalar_one_or_none()
    if parser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CSV parser not found"
        )

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(parser, field, value)

    await db.commit()
    await db.refresh(parser)
    return parser


@router.delete(
    "/{parser_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(verify_csrf)],
)
async def delete_csv_parser(
    parser_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a CSV parser."""
    result = await db.execute(
        select(CsvParser).where(
            CsvParser.id == parser_id, CsvParser.user_id == user.id
        )
    )
    parser = result.scalar_one_or_none()
    if parser is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CSV parser not found"
        )

    await db.delete(parser)
    await db.commit()
