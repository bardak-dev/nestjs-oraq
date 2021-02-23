import {Test,TestingModule} from '@nestjs/testing';
import {Injectable}         from '@nestjs/common';
import {OraqModule}         from '../oraq.module';
import {createToken}        from '../utils/create.token';
import {InjectOraq}         from '../decorators';
import {Oraq}               from '../libs';

describe('RedisModule',() => {
  it('Instance Redis',async() => {
    const module: TestingModule=await Test.createTestingModule({
      imports:[OraqModule.forRoot({
        redis:{
          host:'localhost',
          port:6379
        }
      })]
    }).compile();
    const app=module.createNestApplication();
    await app.init();
    const redisModule=module.get(OraqModule);
    expect(redisModule).toBeInstanceOf(Oraq);
    await app.close();
  });
  it('Instance Redis client provider',async() => {
    const module: TestingModule=await Test.createTestingModule({
      imports:[OraqModule.forRoot([{
        name:'1',
        redis:{
          host:'localhost',
          port:6379
        }
      },{
        name:'test',
        redis:{
          host:'localhost',
          port:6379
        }
      }])]
    }).compile();
    const app=module.createNestApplication();
    await app.init();
    const oraq=module.get(createToken('1'));
    const oraqTest=module.get(createToken('test'));
    expect(oraq).toBeInstanceOf(Oraq);
    expect(oraqTest).toBeInstanceOf(Oraq);
    await app.close();
  });
  it('inject redis connection',async() => {
    @Injectable()
    class TestProvider{
      constructor(
        @InjectOraq() private oraq: Oraq
      ){
      }
      getOraq(){
        return this.oraq;
      }
    }

    const module: TestingModule=await Test.createTestingModule({
      imports:[OraqModule.forRoot({
        redis:{
          host:'localhost',
          port:6379
        }
      })],
      providers:[TestProvider]
    }).compile();
    const app=module.createNestApplication();
    await app.init();
    const provider=module.get(TestProvider);
    expect(provider.getOraq()).toBeInstanceOf(Oraq);
    await app.close();
  });
});
