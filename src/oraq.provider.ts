import { Oraq } from './libs/Oraq';
import { OraqModuleOptions } from './oraq.interface';
import { Provider } from '@nestjs/common';
import { createToken } from './utils/create.token';
import { ORAQ_DEFAULT_KEY, ORAQ_MODULE_OPTIONS } from './oraq.constant';

const instances: Map<string, Oraq> = new Map();

export class OraqProvider {
  /**
   * @param options
   */
  public static createOraq(options: OraqModuleOptions) {
    return new Oraq(options);
  }
  /**
   * @param {OraqModuleOptions[]} options
   * @param {Provider} optionProvider
   * @return {Provider[]}
   */
  public static init(options: OraqModuleOptions[]): Provider[] {
    return options.map((option) => this.createOraqProvider(option));
  }
  /**
   * @param {OraqModuleOptions} option
   * @param optionProvider
   * @return {Provider}
   */
  private static createOraqProvider(option: OraqModuleOptions): Provider {
    const token = createToken(option.name);
    let oraq: Oraq;
    if (instances.get(token)) {
      oraq = instances.get(token);
      return {
        provide: token,
        useValue: oraq,
      };
    } else {
      return {
        provide: token,
        useFactory: (options: OraqModuleOptions[]) => {
          const config = options.find(
            (item) =>
              item.name === option.name ||
              (option.name === ORAQ_DEFAULT_KEY && item.name === undefined),
          );
          option = { ...option, ...config };
          oraq = this.createOraq(option);
          instances.set(token, oraq);
          return oraq;
        },
        inject: [ORAQ_MODULE_OPTIONS],
      };
    }
  }
}
