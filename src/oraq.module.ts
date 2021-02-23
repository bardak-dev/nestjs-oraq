import {DynamicModule,Module}                    from '@nestjs/common';
import {OraqModuleAsyncOption,OraqModuleOptions} from './oraq.interface';
import {OraqCoreModule}                          from './oraq-core.module';

@Module({})
export class OraqModule{
  /**
   * @param options
   */
  static forRoot(options: OraqModuleOptions|OraqModuleOptions[]): DynamicModule{
    return {
      module:OraqModule,
      imports:[OraqCoreModule.forRoot(options)]
    };
  }
  /**
   * @param options
   * @param injectOption
   */
  static forAsync(options: Partial<OraqModuleOptions>|Partial<OraqModuleOptions>[],injectOption: OraqModuleAsyncOption){
    return {
      module:OraqModule,
      imports:[OraqCoreModule.forAsync(options,injectOption)]
    };
  }
}
