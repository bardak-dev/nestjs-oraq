import { ORAQ_PROVIDER } from '../oraq.constant';

export const createToken = (name: string): string => {
  return `${ORAQ_PROVIDER}_${name}`;
};
