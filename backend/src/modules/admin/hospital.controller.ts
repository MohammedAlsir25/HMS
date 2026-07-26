import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler.js';
import * as hospitalService from './hospital.service.js';

export const createHospital = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await hospitalService.createHospital(req.body);
  res.status(201).json(hospital);
});

export const listHospitals = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query['page']) || 1;
  const limit = Number(req.query['limit']) || 20;
  const result = await hospitalService.listHospitals(page, limit);
  res.json(result);
});

export const getHospitalById = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await hospitalService.getHospitalById(req.params['id']!);
  res.json(hospital);
});

export const updateHospital = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await hospitalService.updateHospital(req.params['id']!, req.body);
  res.json(hospital);
});

export const deactivateHospital = asyncHandler(async (req: Request, res: Response) => {
  const hospital = await hospitalService.deactivateHospital(req.params['id']!);
  res.json({ message: 'Hospital deactivated', hospital });
});
