import { Inject } from '@nestjs/common';
import { createToken } from '../utils/create.token';
import { ORAQ_DEFAULT_KEY } from '../oraq.constant';

/**
 * @param name
 * @constructor
 */
export const InjectOraq = (name: string = ORAQ_DEFAULT_KEY) => {
  return Inject(createToken(name));
};
