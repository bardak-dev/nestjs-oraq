import {DynamicModule,Module}                    from '@nestjs/common';
import {OraqModuleAsyncOption,OraqModuleOptions} from './oraq.interface';
import {OraqCoreModule}                          from './oraq-core.module';

@Module({})
export class RedisModule{
  /**
   * @param options
   */
  static forRoot(options: OraqModuleOptions|OraqModuleOptions[]): DynamicModule{
    return {
      module:RedisModule,
      imports:[OraqCoreModule.forRoot(options)]
    };
  }
  /**
   * @param options
   * @param injectOption
   */
  static forAsync(options: Partial<OraqModuleOptions>|Array<Partial<OraqModuleOptions>>,injectOption: OraqModuleAsyncOption){
    return {
      module:RedisModule,
      imports:[OraqCoreModule.forAsync(options,injectOption)]
    };
  }
}
