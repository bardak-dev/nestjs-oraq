import {Provider}                             from '@nestjs/common';
import {createToken}                          from './utils/create.token';
import {ORAQ_DEFAULT_KEY,ORAQ_MODULE_OPTIONS} from './oraq.constant';
import {Oraq}                                 from './libs/Oraq';
import {OraqModuleOptions}                    from './oraq.interface';

const clients: Map<string,Oraq>=new Map();

export class OraqProvider{
  /**
   * @param options
   */
  public static createOraq(options: OraqModuleOptions){
    return new Oraq(options);
  }
  /**
   * @param {OraqModuleOptions[]} options
   * @param {Provider} optionProvider
   * @return {Provider[]}
   */
  public static init(options: OraqModuleOptions[]): Provider[]{
    return options.map(option => this.createOraqProvider(option));
  }
  /**
   * @param {OraqModuleOptions} option
   * @param optionProvider
   * @return {Provider}
   */
  private static createOraqProvider(option: OraqModuleOptions): Provider{
    const token=createToken(option.name);
    let client: Oraq;
    if(clients.get(token)){
      client=clients.get(token);
      return {
        provide:token,
        useValue:client
      };
    }else{
      return {
        provide:token,
        useFactory:(options: OraqModuleOptions[]) => {
          const config=options.find(item => (item.name===option.name)||(option.name===ORAQ_DEFAULT_KEY&&item.name===undefined));
          option={...option,...config};
          client=this.createOraq(option);
          clients.set(token,client);
          return client;
        },
        inject:[ORAQ_MODULE_OPTIONS]
      };
    }
  }
}
