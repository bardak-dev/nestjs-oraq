import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { OraqModuleAsyncOption, OraqModuleOptions } from './oraq.interface';
import { OraqProvider } from './oraq.provider';
import { ORAQ_DEFAULT_KEY, ORAQ_MODULE_OPTIONS } from './oraq.constant';

@Global()
@Module({})
export class OraqCoreModule {
  /**
   * @param options
   */
  static forRoot(
    options: OraqModuleOptions | OraqModuleOptions[],
  ): DynamicModule {
    const optionProvider: Provider = this.createAsyncOptionsProvider({
      useValue: Array.isArray(options) ? options : [options],
    });
    const oraqProviders = OraqProvider.init(
      this.resolveOptions(options),
    );
    return {
      module: OraqCoreModule,
      providers: [optionProvider, ...oraqProviders],
      exports: oraqProviders,
    };
  }
  /**
   * @param options
   * @param injectOption
   */
  static forAsync(
    options: Partial<OraqModuleOptions> | Partial<OraqModuleOptions>[],
    injectOption: OraqModuleAsyncOption,
  ) {
    const optionProvider = this.createAsyncOptionsProvider(injectOption);
    const oraqProviders = OraqProvider.init(
      this.resolveOptions(options as any),
    );
    return {
      module: OraqCoreModule,
      providers: [optionProvider, ...oraqProviders],
      exports: oraqProviders,
    };
  }
  private static resolveOptions(
    options: OraqModuleOptions | OraqModuleOptions[],
  ) {
    if (!Array.isArray(options) && options.name === undefined) {
      options.name = ORAQ_DEFAULT_KEY;
    }
    if (!Array.isArray(options)) {
      options = [options];
    }
    options.forEach((option, index) => {
      if (option.name === undefined) {
        option.name = index.toString();
      }
    });
    return options;
  }
  /**
   * @param {OraqModuleAsyncOption} options
   * @return {Provider}
   */
  private static createAsyncOptionsProvider(
    options: OraqModuleAsyncOption,
  ): Provider {
    return {
      provide: ORAQ_MODULE_OPTIONS,
      useValue: options.useValue,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }
}
