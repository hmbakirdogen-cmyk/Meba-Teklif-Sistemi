import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { makeCrud } from '../lib/crudFactory.js';

export const urunlerRouter: Router = Router();
const crud = makeCrud('urun');

urunlerRouter.get('/', requireAuth, asyncHandler(crud.handleList));
urunlerRouter.put('/', requireAuth, asyncHandler(crud.handleBulkReplace));
urunlerRouter.put('/:id', requireAuth, asyncHandler(crud.handleUpsert));
urunlerRouter.delete('/:id', requireAuth, asyncHandler(crud.handleRemove));
