import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { makeCrud } from '../lib/crudFactory.js';

export const urunSetleriRouter: Router = Router();
const crud = makeCrud('urunSeti');

urunSetleriRouter.get('/', requireAuth, asyncHandler(crud.handleList));
urunSetleriRouter.put('/', requireAuth, asyncHandler(crud.handleBulkReplace));
urunSetleriRouter.put('/:id', requireAuth, asyncHandler(crud.handleUpsert));
urunSetleriRouter.delete('/:id', requireAuth, asyncHandler(crud.handleRemove));
